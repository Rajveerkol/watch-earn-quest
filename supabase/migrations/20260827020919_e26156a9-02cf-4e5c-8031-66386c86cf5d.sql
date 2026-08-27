-- ========== ROLES ==========
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ========== SHARED TRIGGER FN ==========
CREATE OR REPLACE FUNCTION public.we_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- ========== WALLETS ==========
CREATE TABLE public.wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_code text NOT NULL UNIQUE,
  token_hash text NOT NULL UNIQUE,
  balance bigint NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned bigint NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- ========== TASKS ==========
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  youtube_id text NOT NULL,
  reward_rupees numeric NOT NULL CHECK (reward_rupees > 0),
  reward_coins bigint GENERATED ALWAYS AS ((reward_rupees * 1000)::bigint) STORED,
  duration_seconds integer NOT NULL DEFAULT 60 CHECK (duration_seconds BETWEEN 10 AND 3600),
  completion_limit integer NOT NULL DEFAULT 100 CHECK (completion_limit > 0),
  completed_count integer NOT NULL DEFAULT 0 CHECK (completed_count >= 0),
  status text NOT NULL DEFAULT 'active',
  priority integer NOT NULL DEFAULT 0,
  start_at timestamp with time zone,
  end_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX tasks_live_idx ON public.tasks (status, priority DESC, created_at DESC);
CREATE TRIGGER tasks_touch BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.we_touch_updated_at();

-- ========== TASK SESSIONS ==========
CREATE TABLE public.task_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.task_sessions TO service_role;
ALTER TABLE public.task_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX task_sessions_wallet_idx ON public.task_sessions (wallet_id, created_at DESC);

-- ========== COMPLETIONS ==========
CREATE TABLE public.completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE RESTRICT,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT,
  coins bigint NOT NULL CHECK (coins >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (wallet_id, task_id)
);
GRANT ALL ON public.completions TO service_role;
ALTER TABLE public.completions ENABLE ROW LEVEL SECURITY;
CREATE INDEX completions_wallet_idx ON public.completions (wallet_id, created_at DESC);

-- ========== TRANSACTIONS ==========
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'credit',
  amount bigint NOT NULL,
  reason text NOT NULL,
  reference text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX transactions_wallet_idx ON public.transactions (wallet_id, created_at DESC);

-- ========== WITHDRAWALS ==========
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

-- ========== START SESSION ==========
CREATE OR REPLACE FUNCTION public.we_start_session(p_wallet uuid, p_task uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tasks%rowtype; s_id uuid; recent integer;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = p_task;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF t.status <> 'active'
     OR (t.start_at IS NOT NULL AND t.start_at > now())
     OR (t.end_at IS NOT NULL AND t.end_at < now()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unavailable');
  END IF;
  IF t.completed_count >= t.completion_limit THEN
    RETURN jsonb_build_object('ok', false, 'error', 'limit_reached');
  END IF;
  IF EXISTS (SELECT 1 FROM public.completions WHERE wallet_id = p_wallet AND task_id = p_task) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_completed');
  END IF;

  SELECT count(*) INTO recent FROM public.task_sessions
    WHERE wallet_id = p_wallet AND created_at > now() - interval '1 minute';
  IF recent > 12 THEN RETURN jsonb_build_object('ok', false, 'error', 'rate_limited'); END IF;

  INSERT INTO public.task_sessions (wallet_id, task_id) VALUES (p_wallet, p_task)
    RETURNING id INTO s_id;
  UPDATE public.wallets SET last_seen_at = now() WHERE id = p_wallet;
  RETURN jsonb_build_object('ok', true, 'session_id', s_id);
END $$;

-- ========== COMPLETE TASK ==========
CREATE OR REPLACE FUNCTION public.we_complete_task(p_wallet uuid, p_task uuid, p_session uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tasks%rowtype; s public.task_sessions%rowtype; reward bigint; new_balance bigint;
BEGIN
  SELECT * INTO s FROM public.task_sessions
    WHERE id = p_session AND wallet_id = p_wallet AND task_id = p_task FOR UPDATE;
  IF NOT FOUND OR s.completed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_session');
  END IF;

  SELECT * INTO t FROM public.tasks WHERE id = p_task FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF t.status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'error', 'unavailable'); END IF;
  IF t.completed_count >= t.completion_limit THEN
    RETURN jsonb_build_object('ok', false, 'error', 'limit_reached');
  END IF;
  IF now() - s.started_at < make_interval(secs => t.duration_seconds - 2) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'too_fast');
  END IF;
  IF EXISTS (SELECT 1 FROM public.completions WHERE wallet_id = p_wallet AND task_id = p_task) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_completed');
  END IF;

  reward := t.reward_coins;

  INSERT INTO public.completions (wallet_id, task_id, coins) VALUES (p_wallet, p_task, reward);
  UPDATE public.task_sessions SET completed_at = now() WHERE id = p_session;
  UPDATE public.tasks
    SET completed_count = completed_count + 1,
        status = CASE WHEN completed_count + 1 >= completion_limit THEN 'completed' ELSE status END
    WHERE id = p_task;
  UPDATE public.wallets
    SET balance = balance + reward, total_earned = total_earned + reward, last_seen_at = now()
    WHERE id = p_wallet
    RETURNING balance INTO new_balance;
  INSERT INTO public.transactions (wallet_id, kind, amount, reason, reference)
    VALUES (p_wallet, 'credit', reward, 'Task reward: ' || t.title, left(replace(p_task::text,'-',''), 10));

  RETURN jsonb_build_object('ok', true, 'coins', reward, 'balance', new_balance);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'error', 'already_completed');
END $$;

-- ========== REQUEST WITHDRAWAL ==========
CREATE OR REPLACE FUNCTION public.we_request_withdrawal(
  p_wallet uuid, p_coins bigint, p_account text, p_ifsc text, p_holder text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.wallets%rowtype; new_id uuid;
BEGIN
  IF p_coins < 5000 THEN RETURN jsonb_build_object('ok', false, 'error', 'below_minimum'); END IF;
  IF length(coalesce(p_account,'')) < 6 OR length(coalesce(p_ifsc,'')) <> 11 OR length(coalesce(p_holder,'')) < 2 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_details');
  END IF;

  SELECT * INTO w FROM public.wallets WHERE id = p_wallet FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF w.balance < p_coins THEN RETURN jsonb_build_object('ok', false, 'error', 'insufficient'); END IF;
  IF EXISTS (SELECT 1 FROM public.withdrawals WHERE wallet_id = p_wallet AND status = 'pending') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'pending_exists');
  END IF;

  INSERT INTO public.withdrawals (wallet_id, coins, account_number, ifsc_code, holder_name)
    VALUES (p_wallet, p_coins, p_account, upper(p_ifsc), p_holder) RETURNING id INTO new_id;
  UPDATE public.wallets SET balance = balance - p_coins, last_seen_at = now() WHERE id = p_wallet;
  INSERT INTO public.transactions (wallet_id, kind, amount, reason, reference)
    VALUES (p_wallet, 'debit', p_coins, 'Withdrawal requested', 'WDR-' || left(replace(new_id::text,'-',''), 10));

  RETURN jsonb_build_object('ok', true, 'withdrawal_id', new_id,
    'balance', (SELECT balance FROM public.wallets WHERE id = p_wallet));
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'error', 'pending_exists');
END $$;

-- ========== REVIEW WITHDRAWAL ==========
CREATE OR REPLACE FUNCTION public.we_review_withdrawal(p_id uuid, p_status text, p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.withdrawals%rowtype;
BEGIN
  IF p_status NOT IN ('approved','rejected','paid') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_status');
  END IF;
  SELECT * INTO r FROM public.withdrawals WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF r.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'error', 'already_reviewed'); END IF;

  UPDATE public.withdrawals SET status = p_status, admin_note = p_note WHERE id = p_id;

  IF p_status = 'rejected' THEN
    UPDATE public.wallets SET balance = balance + r.coins WHERE id = r.wallet_id;
    INSERT INTO public.transactions (wallet_id, kind, amount, reason, reference)
      VALUES (r.wallet_id, 'credit', r.coins, 'Withdrawal rejected — coins returned',
              'WDR-' || left(replace(r.id::text,'-',''), 10));
  END IF;

  RETURN jsonb_build_object('ok', true);
END $$;

-- ========== LOCK FUNCTIONS TO SERVER ONLY ==========
REVOKE ALL ON FUNCTION public.we_start_session(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.we_complete_task(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.we_request_withdrawal(uuid, bigint, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.we_review_withdrawal(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.we_touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.we_start_session(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.we_complete_task(uuid, uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.we_request_withdrawal(uuid, bigint, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.we_review_withdrawal(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.we_touch_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- ========== STARTER TASKS ==========
INSERT INTO public.tasks (title, youtube_id, reward_rupees, duration_seconds, completion_limit, status, priority)
VALUES
  ('Featured Creator Spotlight', 'aqz-KE-bpKQ', 5, 60, 100, 'active', 30),
  ('Discover Something New', 'jNQXAC9IVRw', 2, 45, 250, 'active', 20),
  ('Weekend Bonus Task', 'dQw4w9WgXcQ', 10, 90, 50, 'active', 10);