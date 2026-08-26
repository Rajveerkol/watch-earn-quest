import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  CircleAlert,
  Coins,
  LogOut,
  Pause,
  Pencil,
  Play,
  Plus,
  ShieldCheck,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  adminDeleteTask,
  adminListTasks,
  adminOverview,
  adminSaveTask,
  adminSetPriority,
  adminSetStatus,
} from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatCoins, parseYouTubeId, rupeesToCoins, thumbnailFor } from "@/lib/youtube";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console — WATCH EARN" },
      {
        name: "description",
        content:
          "WATCH EARN administrator console: platform analytics, task creation, scheduling, completion limits and reward configuration.",
      },
      { property: "og:title", content: "Admin Console — WATCH EARN" },
      { property: "og:description", content: "Manage WATCH EARN tasks and analytics." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminConsole,
});

type TaskRow = {
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

type FormState = {
  id?: string;
  title: string;
  youtubeUrl: string;
  rewardRupees: string;
  durationSeconds: string;
  completionLimit: string;
  status: "draft" | "active" | "paused" | "completed" | "expired";
  priority: string;
  startAt: string;
  endAt: string;
};

const EMPTY_FORM: FormState = {
  title: "",
  youtubeUrl: "",
  rewardRupees: "5",
  durationSeconds: "60",
  completionLimit: "100",
  status: "active",
  priority: "0",
  startAt: "",
  endAt: "",
};

function AdminConsole() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const overviewFn = useServerFn(adminOverview);
  const listFn = useServerFn(adminListTasks);
  const saveFn = useServerFn(adminSaveTask);
  const statusFn = useServerFn(adminSetStatus);
  const priorityFn = useServerFn(adminSetPriority);
  const deleteFn = useServerFn(adminDeleteTask);

  const overview = useQuery({ queryKey: ["admin", "overview"], queryFn: () => overviewFn({}) });
  const tasks = useQuery({ queryKey: ["admin", "tasks"], queryFn: () => listFn({}) });

  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin"] });

  const save = useMutation({
    mutationFn: async (state: FormState) => {
      const youtubeId = parseYouTubeId(state.youtubeUrl);
      if (!youtubeId) throw new Error("Please enter a valid YouTube URL.");
      const rewardRupees = Number(state.rewardRupees);
      const durationSeconds = Number(state.durationSeconds);
      const completionLimit = Number(state.completionLimit);
      if (!(rewardRupees > 0)) throw new Error("Reward must be greater than ₹0.");
      if (!(durationSeconds >= 10)) throw new Error("Duration must be at least 10 seconds.");
      if (!(completionLimit >= 1)) throw new Error("Completion limit must be at least 1.");
      const res = await saveFn({
        data: {
          ...(state.id ? { id: state.id } : {}),
          title: state.title.trim(),
          youtubeId,
          rewardRupees,
          durationSeconds,
          completionLimit,
          status: state.status,
          priority: Number(state.priority) || 0,
          startAt: state.startAt ? new Date(state.startAt).toISOString() : null,
          endAt: state.endAt ? new Date(state.endAt).toISOString() : null,
        },
      });
      if (!res.ok) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      setForm(null);
      setFormError(null);
      void invalidate();
    },
    onError: (err) => setFormError(err instanceof Error ? err.message : "Could not save the task."),
  });

  const setStatus = useMutation({
    mutationFn: (input: { id: string; status: FormState["status"] }) => statusFn({ data: input }),
    onSuccess: invalidate,
  });
  const setPriority = useMutation({
    mutationFn: (input: { id: string; priority: number }) => priorityFn({ data: input }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: invalidate,
  });

  const forbidden =
    overview.error instanceof Error && overview.error.message.includes("Forbidden");

  if (forbidden) {
    return (
      <Wrapper>
        <div className="rounded-3xl p-6 text-center surface-card">
          <CircleAlert className="mx-auto size-6 text-destructive" />
          <p className="mt-3 text-base font-semibold">Not authorised</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This account is not the configured administrator.
          </p>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              void navigate({ to: "/auth" });
            }}
            className="press mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Sign out
          </button>
        </div>
      </Wrapper>
    );
  }

  const cards = overview.data?.cards;

  return (
    <Wrapper>
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl brand-gradient">
            <ShieldCheck className="size-4.5 text-white" strokeWidth={2.4} />
          </span>
          <div className="leading-none">
            <p className="text-[15px] font-extrabold tracking-tight">Admin Console</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              WATCH EARN
            </p>
          </div>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            void navigate({ to: "/auth" });
          }}
          aria-label="Sign out"
          className="press flex size-10 items-center justify-center rounded-2xl surface-card"
        >
          <LogOut className="size-4 text-muted-foreground" />
        </button>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList className="w-full rounded-2xl bg-surface-2/70 p-1">
          <TabsTrigger value="dashboard" className="flex-1 rounded-xl text-xs font-semibold">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex-1 rounded-xl text-xs font-semibold">
            Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-4">
          {overview.isPending ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-[86px] rounded-2xl" />
              ))}
            </div>
          ) : cards ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Active tasks" value={String(cards.activeTasks)} icon={Play} />
                <StatCard
                  label="Completions"
                  value={formatCoins(cards.totalCompletions)}
                  icon={Activity}
                />
                <StatCard
                  label="Coins distributed"
                  value={formatCoins(cards.coinsDistributed)}
                  icon={Coins}
                />
                <StatCard
                  label="Total task value"
                  value={formatCoins(cards.totalTaskValue)}
                  icon={TrendingUp}
                />
                <StatCard label="Paused" value={String(cards.pausedTasks)} icon={Pause} />
                <StatCard
                  label="Completion rate"
                  value={`${cards.completionRate}%`}
                  icon={BarChart3}
                />
              </div>

              <div className="rounded-3xl p-4 surface-card">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Daily completions · 30 days
                </p>
                <div className="mt-3 h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overview.data!.daily}>
                      <defs>
                        <linearGradient id="fillC" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.75} />
                          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeOpacity={0.08} vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v: string) => v.slice(8)}
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                        interval={5}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                        width={26}
                      />
                      <ReTooltip
                        contentStyle={{
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="completions"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        fill="url(#fillC)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl p-4 surface-card">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Coins distributed · 30 days
                </p>
                <div className="mt-3 h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.data!.daily}>
                      <CartesianGrid strokeOpacity={0.08} vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(v: string) => v.slice(8)}
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                        interval={5}
                      />
                      <ReTooltip
                        contentStyle={{
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="coins" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl p-4 surface-card">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Task performance
                </p>
                <div className="mt-3 space-y-3">
                  {overview.data!.taskPerformance.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No task activity yet.</p>
                  ) : (
                    overview.data!.taskPerformance.map((t) => (
                      <div key={t.id}>
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-xs font-medium">{t.title}</p>
                          <p className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                            {t.completed}/{t.limit}
                          </p>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full brand-gradient"
                            style={{
                              width: `${Math.max(3, Math.min(100, (t.completed / Math.max(1, t.limit)) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-destructive">Could not load analytics. Please retry.</p>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <button
            onClick={() => {
              setForm({ ...EMPTY_FORM });
              setFormError(null);
            }}
            className="press mb-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-primary-foreground brand-gradient"
          >
            <Plus className="size-4" /> Add task
          </button>

          {tasks.isPending ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28 rounded-3xl" />
              ))}
            </div>
          ) : (tasks.data ?? []).length === 0 ? (
            <div className="rounded-3xl p-6 text-center surface-card">
              <p className="text-sm font-semibold">No tasks yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create your first task to start rewarding users.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {(tasks.data as TaskRow[]).map((t) => (
                <div key={t.id} className="rounded-3xl p-3 surface-card">
                  <div className="flex gap-3">
                    <img
                      src={thumbnailFor(t.youtube_id)}
                      alt=""
                      loading="lazy"
                      className="size-16 shrink-0 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">{t.title}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                        <StatusChip status={t.status} />
                        <span className="rounded-full bg-surface-2/70 px-2 py-0.5 text-muted-foreground">
                          {formatCoins(Number(t.reward_coins ?? 0))} coins
                        </span>
                        <span className="rounded-full bg-surface-2/70 px-2 py-0.5 text-muted-foreground">
                          {t.duration_seconds}s
                        </span>
                        <span className="rounded-full bg-surface-2/70 px-2 py-0.5 text-muted-foreground">
                          {t.completed_count}/{t.completion_limit}
                        </span>
                        <span className="rounded-full bg-surface-2/70 px-2 py-0.5 text-muted-foreground">
                          P{t.priority}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {t.status === "active" ? (
                      <ActionButton
                        icon={Pause}
                        label="Pause"
                        onClick={() => setStatus.mutate({ id: t.id, status: "paused" })}
                      />
                    ) : (
                      <ActionButton
                        icon={Play}
                        label="Activate"
                        onClick={() => setStatus.mutate({ id: t.id, status: "active" })}
                      />
                    )}
                    <ActionButton
                      icon={TrendingUp}
                      label="Priority +1"
                      onClick={() => setPriority.mutate({ id: t.id, priority: t.priority + 1 })}
                    />
                    <ActionButton
                      icon={Pencil}
                      label="Edit"
                      onClick={() => {
                        setFormError(null);
                        setForm({
                          id: t.id,
                          title: t.title,
                          youtubeUrl: t.youtube_id,
                          rewardRupees: String(t.reward_rupees),
                          durationSeconds: String(t.duration_seconds),
                          completionLimit: String(t.completion_limit),
                          status: t.status as FormState["status"],
                          priority: String(t.priority),
                          startAt: t.start_at ? t.start_at.slice(0, 16) : "",
                          endAt: t.end_at ? t.end_at.slice(0, 16) : "",
                        });
                      }}
                    />
                    <ActionButton
                      icon={Trash2}
                      label="Delete"
                      destructive
                      onClick={() => {
                        if (window.confirm(`Delete "${t.title}"? This cannot be undone.`)) {
                          remove.mutate(t.id);
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={form !== null} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[88vh] max-w-[420px] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              {form?.id ? "Edit task" : "Add task"}
            </DialogTitle>
          </DialogHeader>
          {form && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(form);
              }}
            >
              <Field label="Task title">
                <Input
                  value={form.title}
                  maxLength={140}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Featured Creator Video"
                  className="h-11 rounded-xl bg-surface-2/60"
                />
              </Field>
              <Field label="YouTube URL">
                <Input
                  value={form.youtubeUrl}
                  maxLength={300}
                  onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                  placeholder="https://youtu.be/dQw4w9WgXcQ"
                  className="h-11 rounded-xl bg-surface-2/60"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Reward (₹)">
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={form.rewardRupees}
                    onChange={(e) => setForm({ ...form, rewardRupees: e.target.value })}
                    className="h-11 rounded-xl bg-surface-2/60"
                  />
                </Field>
                <Field label="Duration (sec)">
                  <Input
                    type="number"
                    min="10"
                    value={form.durationSeconds}
                    onChange={(e) => setForm({ ...form, durationSeconds: e.target.value })}
                    className="h-11 rounded-xl bg-surface-2/60"
                  />
                </Field>
              </div>
              <p className="rounded-xl bg-coin/12 px-3 py-2 text-[11px] font-semibold text-coin">
                ₹{form.rewardRupees || 0} = {formatCoins(rupeesToCoins(Number(form.rewardRupees) || 0))}{" "}
                coins (fixed rate)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Completion limit">
                  <Input
                    type="number"
                    min="1"
                    value={form.completionLimit}
                    onChange={(e) => setForm({ ...form, completionLimit: e.target.value })}
                    className="h-11 rounded-xl bg-surface-2/60"
                  />
                </Field>
                <Field label="Priority">
                  <Input
                    type="number"
                    min="0"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="h-11 rounded-xl bg-surface-2/60"
                  />
                </Field>
              </div>
              <Field label="Status">
                <div className="flex flex-wrap gap-2">
                  {(["draft", "active", "paused", "completed", "expired"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, status: s })}
                      className={cn(
                        "press rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize",
                        form.status === s
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-2/70 text-muted-foreground",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start (optional)">
                  <Input
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(e) => setForm({ ...form, startAt: e.target.value })}
                    className="h-11 rounded-xl bg-surface-2/60"
                  />
                </Field>
                <Field label="End (optional)">
                  <Input
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                    className="h-11 rounded-xl bg-surface-2/60"
                  />
                </Field>
              </div>

              {formError && (
                <p className="rounded-xl bg-destructive/12 px-3 py-2 text-xs text-destructive">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={save.isPending}
                className="press w-full rounded-2xl py-3.5 text-sm font-bold text-primary-foreground brand-gradient disabled:opacity-70"
              >
                {save.isPending ? "Saving…" : form.id ? "Save changes" : "Create task"}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background">
      <div className="mx-auto w-full max-w-[480px] overflow-x-hidden px-4 pb-12 pt-5">
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Coins;
}) {
  return (
    <div className="animate-rise rounded-2xl p-3.5 surface-card">
      <Icon className="size-4 text-primary" />
      <p className="mt-2 truncate text-lg font-extrabold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-success/15 text-success"
      : status === "paused"
        ? "bg-coin/15 text-coin"
        : status === "completed"
          ? "bg-primary/18 text-primary"
          : "bg-surface-2/70 text-muted-foreground";
  return (
    <span className={cn("rounded-full px-2 py-0.5 capitalize", tone)}>{status}</span>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof Coins;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "press inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold",
        destructive ? "bg-destructive/12 text-destructive" : "bg-surface-2/70 text-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
