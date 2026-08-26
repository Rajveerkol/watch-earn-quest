import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenInput = z.object({ token: z.string().max(200).nullable() });
const taskInput = tokenInput.extend({ taskId: z.string().uuid() });
const completeInput = taskInput.extend({ sessionId: z.string().uuid() });

export const getFeed = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenInput.parse(d))
  .handler(async ({ data }) => {
    const m = await import("./watch.server");
    const { wallet, token } = await m.resolveWallet(data.token);
    const [tasks, activity] = await Promise.all([
      m.listLiveTasks(wallet.id),
      m.supabaseAdmin
        .from("transactions")
        .select("id, amount, reason, created_at")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .limit(4),
    ]);
    return {
      token,
      wallet: {
        code: wallet.wallet_code,
        balance: Number(wallet.balance),
        totalEarned: Number(wallet.total_earned),
      },
      tasks,
      activity: (activity.data ?? []).map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        reason: t.reason,
        createdAt: t.created_at,
      })),
    };
  });

export const getTaskDetail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => taskInput.parse(d))
  .handler(async ({ data }) => {
    const m = await import("./watch.server");
    const { wallet } = await m.resolveWallet(data.token);
    const tasks = await m.listLiveTasks(wallet.id);
    const task = tasks.find((t) => t.id === data.taskId) ?? null;
    const { data: openSession } = await m.supabaseAdmin
      .from("task_sessions")
      .select("task_id")
      .eq("wallet_id", wallet.id)
      .is("completed_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      task,
      activeOtherTaskId:
        openSession && openSession.task_id !== data.taskId ? openSession.task_id : null,
    };
  });

export const startTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => taskInput.parse(d))
  .handler(async ({ data }) => {
    const m = await import("./watch.server");
    const { wallet } = await m.resolveWallet(data.token);
    const { data: result, error } = await m.supabaseAdmin.rpc("we_start_session", {
      p_wallet: wallet.id,
      p_task: data.taskId,
    });
    if (error) return { ok: false as const, error: "Something went wrong. Please try again." };
    const payload = result as { ok: boolean; error?: string; session_id?: string };
    if (!payload.ok) {
      return {
        ok: false as const,
        error: m.ERROR_COPY[payload.error ?? ""] ?? "This task is not available right now.",
      };
    }
    return { ok: true as const, sessionId: payload.session_id! };
  });

export const completeTask = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => completeInput.parse(d))
  .handler(async ({ data }) => {
    const m = await import("./watch.server");
    const { wallet } = await m.resolveWallet(data.token);
    const { data: result, error } = await m.supabaseAdmin.rpc("we_complete_task", {
      p_wallet: wallet.id,
      p_task: data.taskId,
      p_session: data.sessionId,
    });
    if (error) return { ok: false as const, error: "Something went wrong. Please try again." };
    const payload = result as {
      ok: boolean;
      error?: string;
      coins?: number;
      balance?: number;
    };
    if (!payload.ok) {
      return {
        ok: false as const,
        error: m.ERROR_COPY[payload.error ?? ""] ?? "Reward could not be verified.",
      };
    }
    return {
      ok: true as const,
      coins: Number(payload.coins ?? 0),
      balance: Number(payload.balance ?? 0),
    };
  });

export const getWalletOverview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenInput.parse(d))
  .handler(async ({ data }) => {
    const m = await import("./watch.server");
    const { wallet, token } = await m.resolveWallet(data.token);
    const [txns, comps] = await Promise.all([
      m.supabaseAdmin
        .from("transactions")
        .select("id, kind, amount, reason, reference, created_at")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .limit(50),
      m.supabaseAdmin
        .from("completions")
        .select("id, coins, created_at, tasks(title, youtube_id)")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    return {
      token,
      wallet: {
        code: wallet.wallet_code,
        balance: Number(wallet.balance),
        totalEarned: Number(wallet.total_earned),
        createdAt: wallet.created_at,
      },
      transactions: (txns.data ?? []).map((t) => ({
        id: t.id,
        kind: t.kind,
        amount: Number(t.amount),
        reason: t.reason,
        reference: t.reference,
        createdAt: t.created_at,
      })),
      completions: (comps.data ?? []).map((c) => ({
        id: c.id,
        coins: Number(c.coins),
        createdAt: c.created_at,
        title: (c.tasks as { title: string } | null)?.title ?? "Task",
        youtubeId: (c.tasks as { youtube_id: string } | null)?.youtube_id ?? "",
      })),
    };
  });

const withdrawInput = tokenInput.extend({
  coins: z.number().int().min(5000).max(100_000_000),
  accountNumber: z.string().trim().regex(/^\d{6,20}$/),
  ifscCode: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .refine((v) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v), "Invalid IFSC code"),
  holderName: z.string().trim().min(2).max(80),
});

export const requestWithdrawal = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => withdrawInput.parse(d))
  .handler(async ({ data }) => {
    const m = await import("./watch.server");
    const { wallet } = await m.resolveWallet(data.token);
    const { data: result, error } = await m.supabaseAdmin.rpc("we_request_withdrawal", {
      p_wallet: wallet.id,
      p_coins: data.coins,
      p_account: data.accountNumber,
      p_ifsc: data.ifscCode,
      p_holder: data.holderName,
    });
    if (error) return { ok: false as const, error: "Something went wrong. Please try again." };
    const payload = result as { ok: boolean; error?: string; balance?: number };
    if (!payload.ok) {
      return {
        ok: false as const,
        error: m.ERROR_COPY[payload.error ?? ""] ?? "Withdrawal could not be created.",
      };
    }
    return { ok: true as const, balance: Number(payload.balance ?? 0) };
  });

export const getWithdrawals = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenInput.parse(d))
  .handler(async ({ data }) => {
    const m = await import("./watch.server");
    const { wallet, token } = await m.resolveWallet(data.token);
    const { data: rows } = await m.supabaseAdmin
      .from("withdrawals")
      .select("id, coins, account_number, ifsc_code, holder_name, status, admin_note, created_at")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(50);
    return {
      token,
      balance: Number(wallet.balance),
      withdrawals: (rows ?? []).map((r) => ({
        id: r.id,
        coins: Number(r.coins),
        accountLast4: r.account_number.slice(-4),
        ifscCode: r.ifsc_code,
        holderName: r.holder_name,
        status: r.status,
        adminNote: r.admin_note,
        createdAt: r.created_at,
      })),
    };
  });
