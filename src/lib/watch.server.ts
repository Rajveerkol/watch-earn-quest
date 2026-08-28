import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const COINS_PER_RUPEE = 1000;

export async function sha256hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomFrom(alphabet: string, length: number): string {
  const buf = new Uint8Array(length);
  globalThis.crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < length; i += 1) out += alphabet[buf[i]! % alphabet.length];
  return out;
}

export function newWalletCode(): string {
  return `WE-${randomFrom(CODE_ALPHABET, 8)}`;
}

export function newWalletToken(): string {
  const buf = new Uint8Array(32);
  globalThis.crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type WalletRow = {
  id: string;
  wallet_code: string;
  balance: number;
  total_earned: number;
  created_at: string;
};

export type WalletSession = { wallet: WalletRow; token: string };

/** Resolves an existing wallet from its secret token, or mints a brand new one. */
export async function resolveWallet(token: string | null): Promise<WalletSession> {
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    const hash = await sha256hex(token);
    const { data } = await supabaseAdmin
      .from("wallets")
      .select("id, wallet_code, balance, total_earned, created_at")
      .eq("token_hash", hash)
      .maybeSingle();
    if (data) {
      await supabaseAdmin
        .from("wallets")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", data.id);
      return { wallet: data as WalletRow, token };
    }
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const freshToken = newWalletToken();
    const { data, error } = await supabaseAdmin
      .from("wallets")
      .insert({ wallet_code: newWalletCode(), token_hash: await sha256hex(freshToken) })
      .select("id, wallet_code, balance, total_earned, created_at")
      .single();
    if (!error && data) return { wallet: data as WalletRow, token: freshToken };
  }
  throw new Error("Could not create a wallet. Please try again.");
}

export type PublicTask = {
  id: string;
  title: string;
  youtubeId: string;
  rewardCoins: number;
  durationSeconds: number;
  completionLimit: number;
  completedCount: number;
  remaining: number;
  completedByMe: boolean;
};

export async function listLiveTasks(walletId: string): Promise<PublicTask[]> {
  const nowIso = new Date().toISOString();
  const [{ data: tasks }, { data: mine }] = await Promise.all([
    supabaseAdmin
      .from("tasks")
      .select(
        "id, title, youtube_id, reward_coins, duration_seconds, completion_limit, completed_count, start_at, end_at",
      )
      .eq("status", "active")
      .or(`start_at.is.null,start_at.lte.${nowIso}`)
      .or(`end_at.is.null,end_at.gte.${nowIso}`)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60),
    supabaseAdmin.from("completions").select("task_id").eq("wallet_id", walletId),
  ]);

  const done = new Set((mine ?? []).map((r) => r.task_id));
  return (tasks ?? [])
    .filter((t) => t.completed_count < t.completion_limit)
    .map((t) => ({
      id: t.id,
      title: t.title,
      youtubeId: t.youtube_id,
      rewardCoins: Number(t.reward_coins ?? 0),
      durationSeconds: t.duration_seconds,
      completionLimit: t.completion_limit,
      completedCount: t.completed_count,
      remaining: Math.max(0, t.completion_limit - t.completed_count),
      completedByMe: done.has(t.id),
    }));
}

export const ERROR_COPY: Record<string, string> = {
  not_found: "This task no longer exists.",
  unavailable: "This task is no longer available.",
  already_completed: "You have already completed this task.",
  limit_reached: "This task has reached its completion limit.",
  rate_limited: "Too many attempts. Please slow down and try again.",
  invalid_session: "Your task session expired. Please start the task again.",
  too_fast: "Keep watching — the required time is not complete yet.",
  below_minimum: "Minimum withdrawal is 5,000 coins.",
  insufficient: "You do not have enough coins for this withdrawal.",
  pending_exists: "You already have a withdrawal request in review.",
  invalid_details: "Please check your account number and IFSC code.",
};

export { supabaseAdmin };

/** Resolves (or creates) the single wallet that belongs to a signed-in account. */
export async function resolveWalletForUser(userId: string): Promise<WalletRow> {
  const select = "id, wallet_code, balance, total_earned, created_at";

  const { data: existing } = await supabaseAdmin
    .from("wallets")
    .select(select)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    await supabaseAdmin
      .from("wallets")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", existing.id);
    return existing as WalletRow;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabaseAdmin
      .from("wallets")
      .insert({
        wallet_code: newWalletCode(),
        token_hash: await sha256hex(newWalletToken()),
        user_id: userId,
      })
      .select(select)
      .single();
    if (!error && data) return data as WalletRow;

    const { data: raced } = await supabaseAdmin
      .from("wallets")
      .select(select)
      .eq("user_id", userId)
      .maybeSingle();
    if (raced) return raced as WalletRow;
  }
  throw new Error("Could not open your wallet. Please try again.");
}
