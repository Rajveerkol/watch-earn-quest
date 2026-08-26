import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CircleAlert,
  CircleCheckBig,
  Clock,
  Coins,
  Hand,
  Loader2,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { AppShell, EmptyState } from "@/components/we/app-shell";
import { CoinPill } from "@/components/we/coin";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useCompleteTask, useStartTask, useTaskDetail } from "@/lib/use-watch";
import { cn } from "@/lib/utils";
import { formatCoins, formatDuration, thumbnailFor } from "@/lib/youtube";

export const Route = createFileRoute("/task/$taskId")({
  head: () => ({
    meta: [
      { title: "Task — WATCH EARN" },
      {
        name: "description",
        content:
          "Complete this WATCH EARN task requirement to earn virtual coins. Rewards are verified and credited on our servers.",
      },
      { property: "og:title", content: "Task — WATCH EARN" },
      {
        property: "og:description",
        content: "Complete the task requirement and collect your virtual coins.",
      },
    ],
  }),
  component: TaskScreen,
});

type Phase = "details" | "active" | "verifying" | "done";

function TaskScreen() {
  const { taskId } = Route.useParams();
  const navigate = useNavigate();
  const { data, isPending, isError, refetch } = useTaskDetail(taskId);
  const start = useStartTask();
  const complete = useCompleteTask();

  const [phase, setPhase] = useState<Phase>("details");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [checkpointDue, setCheckpointDue] = useState(false);
  const [checkpointDone, setCheckpointDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reward, setReward] = useState<{ coins: number; balance: number } | null>(null);
  const checkpointAt = useRef(0);

  const task = data?.task ?? null;
  const duration = task?.durationSeconds ?? 60;
  const remainingSecs = Math.max(0, duration - elapsed);
  const timeSatisfied = elapsed >= duration;
  const requirementsMet = timeSatisfied && checkpointDone;

  // The requirement is an on-site attention task: the timer only advances while
  // this tab is visible, and a mid-task confirmation tap must be acknowledged.
  useEffect(() => {
    if (phase !== "active") return;
    const onVisibility = () => setPaused(document.visibilityState !== "visible");
    document.addEventListener("visibilitychange", onVisibility);
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setElapsed((e) => {
        const next = e + 1;
        if (!checkpointDone && next >= checkpointAt.current) setCheckpointDue(true);
        return next;
      });
    }, 1000);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [phase, checkpointDone]);

  useEffect(() => {
    if (phase === "active") {
      window.history.pushState({ weTask: true }, "");
      const onPop = () => {
        const leave = window.confirm("Leave this task? Your progress will be lost.");
        if (leave) navigate({ to: "/tasks" });
        else window.history.pushState({ weTask: true }, "");
      };
      window.addEventListener("popstate", onPop);
      return () => window.removeEventListener("popstate", onPop);
    }
    return undefined;
  }, [phase, navigate]);

  const onStart = useCallback(async () => {
    setErrorMessage(null);
    const res = await start.mutateAsync(taskId);
    if (!res.ok) {
      setErrorMessage(res.error);
      return;
    }
    checkpointAt.current = Math.max(5, Math.floor(duration * 0.55));
    setSessionId(res.sessionId);
    setElapsed(0);
    setCheckpointDone(false);
    setCheckpointDue(false);
    setPhase("active");
  }, [duration, start, taskId]);

  const onClaim = useCallback(async () => {
    if (!sessionId) return;
    setErrorMessage(null);
    setPhase("verifying");
    const res = await complete.mutateAsync({ taskId, sessionId });
    if (!res.ok) {
      setErrorMessage(res.error);
      setPhase("active");
      return;
    }
    setReward({ coins: res.coins, balance: res.balance });
    setPhase("done");
  }, [complete, sessionId, taskId]);

  const progress = useMemo(
    () => Math.min(100, Math.round((elapsed / duration) * 100)),
    [duration, elapsed],
  );

  if (isPending) {
    return (
      <AppShell hideNav>
        <div className="space-y-4">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="aspect-video w-full rounded-3xl" />
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-24 w-full rounded-3xl" />
        </div>
      </AppShell>
    );
  }

  if (isError || !task) {
    return (
      <AppShell>
        <BackLink />
        <EmptyState
          icon={CircleAlert}
          title={isError ? "Something went wrong" : "Task unavailable"}
          description={
            isError
              ? "We couldn't load this task. Please check your connection and try again."
              : "This task is no longer available. It may have finished or reached its completion limit."
          }
          action={
            isError ? (
              <button
                onClick={() => void refetch()}
                className="press rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Try again
              </button>
            ) : (
              <Link
                to="/tasks"
                className="press inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Browse tasks
              </Link>
            )
          }
        />
      </AppShell>
    );
  }

  if (phase === "done" && reward) {
    return (
      <AppShell hideNav>
        <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
          <div className="animate-pop relative flex size-24 items-center justify-center rounded-full coin-gradient">
            <CircleCheckBig className="size-11 text-coin-foreground" strokeWidth={2.6} />
            <span className="animate-float-up absolute -top-2 text-lg font-extrabold text-coin">
              +{formatCoins(reward.coins)}
            </span>
          </div>
          <p className="animate-rise mt-6 text-xs font-bold uppercase tracking-[0.24em] text-success">
            Task completed
          </p>
          <p className="animate-pop mt-2 flex items-baseline gap-2 text-4xl font-extrabold tracking-tight">
            <Coins className="size-7 text-coin" strokeWidth={2.4} />+{formatCoins(reward.coins)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Virtual coins credited to your wallet</p>
          <div className="animate-rise mt-5 rounded-2xl px-4 py-3 surface-card">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              New balance
            </p>
            <p className="text-lg font-bold tabular-nums">{formatCoins(reward.balance)} coins</p>
          </div>
          <div className="mt-8 flex w-full flex-col gap-2">
            <Link
              to="/tasks"
              className="press w-full rounded-2xl py-3.5 text-center text-sm font-bold text-primary-foreground brand-gradient"
            >
              Next task
            </Link>
            <Link
              to="/wallet"
              className="press w-full rounded-2xl py-3.5 text-center text-sm font-semibold surface-card"
            >
              View wallet
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const blockedByOther = phase === "details" && data?.activeOtherTaskId;

  return (
    <AppShell hideNav={phase !== "details"}>
      {phase === "details" ? <BackLink /> : <div className="h-2" />}

      <div className="animate-rise overflow-hidden rounded-3xl surface-card">
        <div className="relative aspect-video w-full bg-black">
          {phase === "details" ? (
            <img
              src={thumbnailFor(task.youtubeId, "hq")}
              alt={task.title}
              className="size-full object-cover"
            />
          ) : (
            <iframe
              title={task.title}
              src={`https://www.youtube-nocookie.com/embed/${task.youtubeId}?rel=0&playsinline=1&modestbranding=1`}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              className="size-full border-0"
            />
          )}
        </div>
        <div className="p-4">
          <h1 className="text-lg font-bold leading-snug text-balance-tight">{task.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CoinPill amount={task.rewardCoins} prefix="+" />
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-2/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              <Clock className="size-3.5" />
              {formatDuration(task.durationSeconds)} required
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-2/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              <Users className="size-3.5" />
              {task.remaining} of {task.completionLimit} left
            </span>
          </div>
        </div>
      </div>

      {phase === "details" && (
        <>
          <section className="animate-rise mt-4 rounded-3xl p-4 surface-card">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              What you need to do
            </p>
            <ul className="mt-3 space-y-2.5 text-sm">
              <Requirement text={`Stay on the task screen for ${formatDuration(task.durationSeconds)}`} />
              <Requirement text="Confirm the attention checkpoint when it appears" />
              <Requirement text="Claim your reward — we verify it on our servers" />
            </ul>
            <p className="mt-4 flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
              One completion per wallet. Rewards are virtual coins only ({formatCoins(1000)} coins = ₹1
              reference).
            </p>
          </section>

          {errorMessage && <ErrorNote message={errorMessage} />}

          {task.completedByMe ? (
            <div className="mt-4 rounded-2xl bg-success/12 px-4 py-3 text-center text-sm font-semibold text-success">
              You have already completed this task.
            </div>
          ) : blockedByOther ? (
            <div className="mt-4 rounded-3xl p-4 text-center surface-card">
              <Lock className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold">Another task is in progress</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Only one task can be active at a time. Finish it before starting this one.
              </p>
              <Link
                to="/task/$taskId"
                params={{ taskId: data!.activeOtherTaskId! }}
                className="press mt-3 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Go to active task
              </Link>
            </div>
          ) : (
            <button
              onClick={() => void onStart()}
              disabled={start.isPending}
              className="press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-primary-foreground brand-gradient disabled:opacity-70"
            >
              {start.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4 fill-current" />
              )}
              Start task
            </button>
          )}
        </>
      )}

      {(phase === "active" || phase === "verifying") && (
        <>
          <section className="mt-4 rounded-3xl p-4 surface-card">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Task progress
              </p>
              <p className="text-sm font-bold tabular-nums">
                {timeSatisfied ? "Ready" : `${remainingSecs}s`}
              </p>
            </div>
            <Progress value={progress} className="mt-3 h-2 bg-surface-2" />
            <p className="mt-3 text-xs text-muted-foreground">
              {paused
                ? "Paused — return to this screen to keep progressing."
                : timeSatisfied
                  ? "Time requirement complete."
                  : "Keep this screen open to complete the requirement."}
            </p>
          </section>

          {checkpointDue && !checkpointDone && (
            <button
              onClick={() => {
                setCheckpointDone(true);
                setCheckpointDue(false);
              }}
              className="press mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-accent/40 bg-accent/12 py-3.5 text-sm font-bold text-accent"
            >
              <Hand className="size-4" />
              Tap to confirm you're still here
            </button>
          )}

          {errorMessage && <ErrorNote message={errorMessage} />}

          <button
            onClick={() => void onClaim()}
            disabled={!requirementsMet || phase === "verifying"}
            className={cn(
              "press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold",
              requirementsMet && phase !== "verifying"
                ? "text-primary-foreground brand-gradient"
                : "bg-surface-2 text-muted-foreground",
            )}
          >
            {phase === "verifying" ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Verifying your task…
              </>
            ) : requirementsMet ? (
              <>
                <Sparkles className="size-4" /> Claim {formatCoins(task.rewardCoins)} coins
              </>
            ) : (
              <>
                <Lock className="size-4" />
                {checkpointDone || !checkpointDue ? "Requirement in progress" : "Confirm checkpoint"}
              </>
            )}
          </button>
        </>
      )}
    </AppShell>
  );
}

function Requirement({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-muted-foreground">
      <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-primary" />
      <span className="text-foreground/90">{text}</span>
    </li>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div className="animate-rise mt-3 flex items-start gap-2 rounded-2xl bg-destructive/12 px-4 py-3 text-sm text-destructive">
      <CircleAlert className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/tasks"
      className="press mb-3 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold surface-card"
    >
      <ArrowLeft className="size-4" />
      Back
    </Link>
  );
}
