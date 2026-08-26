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
