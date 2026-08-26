-- 1) Completion history must be permanent so a wallet can never re-earn a task
ALTER TABLE public.completions DROP CONSTRAINT completions_task_id_fkey;
ALTER TABLE public.completions
  ADD CONSTRAINT completions_task_id_fkey FOREIGN KEY (task_id)
  REFERENCES public.tasks(id) ON DELETE RESTRICT;

-- 2) Withdrawals
CREATE TABLE public.withdrawals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  coins bigint NOT NULL CHECK (coins >= 5000),
  account_number text NOT NULL,
  ifsc_code text NOT NULL,
  holder_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE INDEX withdrawals_wallet_idx ON public.withdrawals (wallet_id, created_at DESC);
CREATE UNIQUE INDEX withdrawals_one_pending_idx ON public.withdrawals (wallet_id) WHERE status = 'pending';

CREATE TRIGGER withdrawals_touch BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.we_touch_updated_at();

-- 3) Request a withdrawal (server-only)
CREATE OR REPLACE FUNCTION public.we_request_withdrawal(
  p_wallet uuid, p_coins bigint, p_account text, p_ifsc text, p_holder text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare w public.wallets%rowtype; new_id uuid;
begin
  if p_coins < 5000 then return jsonb_build_object('ok', false, 'error', 'below_minimum'); end if;
  if length(coalesce(p_account,'')) < 6 or length(coalesce(p_ifsc,'')) <> 11 or length(coalesce(p_holder,'')) < 2 then
    return jsonb_build_object('ok', false, 'error', 'invalid_details');
  end if;

  select * into w from public.wallets where id = p_wallet for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if w.balance < p_coins then return jsonb_build_object('ok', false, 'error', 'insufficient'); end if;
  if exists (select 1 from public.withdrawals where wallet_id = p_wallet and status = 'pending') then
    return jsonb_build_object('ok', false, 'error', 'pending_exists');
  end if;

  insert into public.withdrawals (wallet_id, coins, account_number, ifsc_code, holder_name)
    values (p_wallet, p_coins, p_account, upper(p_ifsc), p_holder)
    returning id into new_id;

  update public.wallets set balance = balance - p_coins, last_seen_at = now() where id = p_wallet;

  insert into public.transactions (wallet_id, kind, amount, reason, reference)
    values (p_wallet, 'debit', p_coins, 'Withdrawal requested', 'WDR-' || left(replace(new_id::text,'-',''), 10));

  return jsonb_build_object('ok', true, 'withdrawal_id', new_id,
    'balance', (select balance from public.wallets where id = p_wallet));
exception when unique_violation then
  return jsonb_build_object('ok', false, 'error', 'pending_exists');
end $$;

-- 4) Admin review (server-only)
CREATE OR REPLACE FUNCTION public.we_review_withdrawal(p_id uuid, p_status text, p_note text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare r public.withdrawals%rowtype;
begin
  if p_status not in ('approved','rejected','paid') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;
  select * into r from public.withdrawals where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.status <> 'pending' then return jsonb_build_object('ok', false, 'error', 'already_reviewed'); end if;

  update public.withdrawals set status = p_status, admin_note = p_note where id = p_id;

  if p_status = 'rejected' then
    update public.wallets set balance = balance + r.coins where id = r.wallet_id;
    insert into public.transactions (wallet_id, kind, amount, reason, reference)
      values (r.wallet_id, 'credit', r.coins, 'Withdrawal rejected — coins returned',
              'WDR-' || left(replace(r.id::text,'-',''), 10));
  end if;

  return jsonb_build_object('ok', true);
end $$;

REVOKE ALL ON FUNCTION public.we_request_withdrawal(uuid, bigint, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.we_review_withdrawal(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.we_request_withdrawal(uuid, bigint, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.we_review_withdrawal(uuid, text, text) TO service_role;