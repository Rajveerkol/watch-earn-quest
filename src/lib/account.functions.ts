import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const USERNAME_RULE = /^[a-z0-9_]{3,20}$/;

const credentials = z.object({
  username: z
    .string()
    .trim()
    .transform((v) => v.toLowerCase())
    .refine((v) => USERNAME_RULE.test(v), "Invalid user ID"),
  password: z.string().min(8).max(72),
});

/** Turns a user ID into the internal login address used by the auth system. */
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@watchearn.app`;
}

export const signUpAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => credentials.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", data.username)
      .maybeSingle();
    if (existing) {
      return { ok: false as const, error: "That user ID is already taken. Try another one." };
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(data.username),
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username },
    });
    if (error || !created.user) {
      return { ok: false as const, error: "That user ID is already taken. Try another one." };
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({ id: created.user.id, username: data.username });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return { ok: false as const, error: "That user ID is already taken. Try another one." };
    }

    return { ok: true as const, username: data.username };
  });

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await import("./watch.server");
    const wallet = await m.resolveWalletForUser(context.userId);
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("username")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      username: profile?.username ?? "member",
      walletCode: wallet.wallet_code,
      balance: Number(wallet.balance),
      totalEarned: Number(wallet.total_earned),
    };
  });
