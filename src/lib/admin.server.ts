import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Confirms the signed-in user is the configured administrator.
 * The deployment-configured ADMIN_EMAIL is auto-granted the admin role once.
 */
export async function assertAdmin(userId: string, email: string | null): Promise<void> {
  const configured = (process.env["ADMIN_EMAIL"] ?? "").trim().toLowerCase();
  const normalized = (email ?? "").trim().toLowerCase();

  const { data: existing } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (existing) return;

  if (configured && normalized && configured === normalized) {
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
    return;
  }
  throw new Error("Forbidden: this account is not an administrator.");
}

export type AdminTaskRow = {
  id: string;
  title: string;
  youtube_id: string;
  reward_rupees: number;
  reward_coins: number | null;
  duration_seconds: number;
  completion_limit: number;
  completed_count: number;
  status: string;
  priority: number;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
};

export async function loadAnalytics() {
  const since = new Date(Date.now() - 29 * 86400000).toISOString();
  const [tasksRes, compRes] = await Promise.all([
    supabaseAdmin
      .from("tasks")
      .select("id, title, status, reward_coins, completion_limit, completed_count"),
    supabaseAdmin
      .from("completions")
      .select("coins, created_at, task_id")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(5000),
  ]);

  const tasks = tasksRes.data ?? [];
  const comps = compRes.data ?? [];

  const { count: totalCompletions } = await supabaseAdmin
    .from("completions")
    .select("id", { count: "exact", head: true });

  const { data: allCoins } = await supabaseAdmin.from("transactions").select("amount");
  const coinsDistributed = (allCoins ?? []).reduce((sum, t) => sum + Number(t.amount), 0);

  const daily = new Map<string, { completions: number; coins: number }>();
  for (let i = 29; i >= 0; i -= 1) {
    const key = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    daily.set(key, { completions: 0, coins: 0 });
  }
  for (const c of comps) {
    const key = c.created_at.slice(0, 10);
    const bucket = daily.get(key);
    if (bucket) {
      bucket.completions += 1;
      bucket.coins += Number(c.coins);
    }
  }

  const perTask = new Map<string, number>();
  for (const c of comps) perTask.set(c.task_id, (perTask.get(c.task_id) ?? 0) + 1);

  const totalSlots = tasks.reduce((s, t) => s + t.completion_limit, 0);
  const usedSlots = tasks.reduce((s, t) => s + t.completed_count, 0);

  return {
    cards: {
      activeTasks: tasks.filter((t) => t.status === "active").length,
      pausedTasks: tasks.filter((t) => t.status === "paused").length,
      completedTasks: tasks.filter((t) => t.status === "completed").length,
      totalTasks: tasks.length,
      totalCompletions: totalCompletions ?? 0,
      coinsDistributed,
      totalTaskValue: tasks.reduce(
        (s, t) => s + Number(t.reward_coins ?? 0) * t.completion_limit,
        0,
      ),
      remainingSlots: Math.max(0, totalSlots - usedSlots),
      completionRate: totalSlots === 0 ? 0 : Math.round((usedSlots / totalSlots) * 100),
    },
    daily: Array.from(daily.entries()).map(([date, v]) => ({
      date,
      completions: v.completions,
      coins: v.coins,
    })),
    taskPerformance: tasks
      .map((t) => ({
        id: t.id,
        title: t.title,
        completions: perTask.get(t.id) ?? 0,
        limit: t.completion_limit,
        completed: t.completed_count,
      }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 6),
  };
}

export { supabaseAdmin };
