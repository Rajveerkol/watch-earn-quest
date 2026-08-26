import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const idInput = z.object({ id: z.string().uuid() });

const taskPayload = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(140),
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  rewardRupees: z.number().positive().max(10000),
  durationSeconds: z.number().int().min(10).max(7200),
  completionLimit: z.number().int().min(1).max(1000000),
  status: z.enum(["draft", "active", "paused", "completed", "expired"]),
  priority: z.number().int().min(0).max(9999),
  startAt: z.string().nullable(),
  endAt: z.string().nullable(),
});

const statusInput = idInput.extend({
  status: z.enum(["draft", "active", "paused", "completed", "expired"]),
});

const priorityInput = idInput.extend({ priority: z.number().int().min(0).max(9999) });

async function guard(context: { userId: string; supabase: { auth: { getUser: () => Promise<{ data: { user: { email?: string | null } | null } }> } } }) {
  const m = await import("./admin.server");
  const { data } = await context.supabase.auth.getUser();
  await m.assertAdmin(context.userId, data.user?.email ?? null);
  return m;
}

export const adminWhoAmI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await guard(context);
    return { ok: true as const };
  });

export const adminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await guard(context);
    return m.loadAnalytics();
  });

export const adminListTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const m = await guard(context);
    const { data } = await m.supabaseAdmin
      .from("tasks")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);
    return (data ?? []) as unknown as import("./admin.server").AdminTaskRow[];
  });

export const adminSaveTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => taskPayload.parse(d))
  .handler(async ({ context, data }) => {
    const m = await guard(context);
    const row = {
      title: data.title,
      youtube_id: data.youtubeId,
      reward_rupees: data.rewardRupees,
      duration_seconds: data.durationSeconds,
      completion_limit: data.completionLimit,
      status: data.status,
      priority: data.priority,
      start_at: data.startAt,
      end_at: data.endAt,
    };
    if (data.id) {
      const { error } = await m.supabaseAdmin.from("tasks").update(row).eq("id", data.id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, id: data.id };
    }
    const { data: created, error } = await m.supabaseAdmin
      .from("tasks")
      .insert(row)
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, id: created.id };
  });

export const adminSetStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => statusInput.parse(d))
  .handler(async ({ context, data }) => {
    const m = await guard(context);
    const { error } = await m.supabaseAdmin
      .from("tasks")
      .update({ status: data.status })
      .eq("id", data.id);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

export const adminSetPriority = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => priorityInput.parse(d))
  .handler(async ({ context, data }) => {
    const m = await guard(context);
    const { error } = await m.supabaseAdmin
      .from("tasks")
      .update({ priority: data.priority })
      .eq("id", data.id);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

export const adminDeleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ context, data }) => {
    const m = await guard(context);
    const { error } = await m.supabaseAdmin.from("tasks").delete().eq("id", data.id);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });
