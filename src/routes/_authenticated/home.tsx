import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Coins, Flame, Sparkles, TrendingUp, Wallet } from "lucide-react";

import { AppShell, EmptyState } from "@/components/we/app-shell";
import { TaskCard, TaskCardSkeleton } from "@/components/we/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeed } from "@/lib/use-watch";
import { relativeTime } from "@/lib/wallet-client";
import { formatCoins } from "@/lib/youtube";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "WATCH EARN — Earn Virtual Coins For Simple Tasks" },
      {
        name: "description",
        content:
          "WATCH EARN is a mobile rewards app: complete short website tasks and collect virtual coins in your anonymous wallet. 1,000 coins = ₹1 reference value.",
      },
      { property: "og:title", content: "WATCH EARN — Mobile Rewards Platform" },
      {
        property: "og:description",
        content:
          "Complete simple website tasks and collect virtual coins instantly. No signup required.",
      },
    ],
  }),
  component: HomeScreen,
});

function HomeScreen() {
  const { data, isPending, isError, refetch } = useFeed();
  const tasks = data?.tasks ?? [];
  const available = tasks.filter((t) => !t.completedByMe);

  return (
    <AppShell>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl brand-gradient">
            <Sparkles className="size-4.5 text-white" strokeWidth={2.4} />
          </span>
          <div className="leading-none">
            <p className="text-[15px] font-extrabold tracking-tight">WATCH EARN</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Virtual Rewards
            </p>
          </div>
        </div>
        <Link
          to="/wallet"
          aria-label="Open wallet"
          className="press flex size-10 items-center justify-center rounded-2xl surface-card"
        >
          <Wallet className="size-4.5 text-primary" />
        </Link>
      </div>

      <section className="animate-rise relative overflow-hidden rounded-3xl p-5 surface-card">
        <div aria-hidden className="absolute -right-8 -top-10 size-36 rounded-full opacity-25 blur-2xl brand-gradient" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Virtual coin balance
        </p>
        {isPending ? (
          <Skeleton className="mt-3 h-10 w-40" />
        ) : (
          <p className="mt-2 flex items-baseline gap-2 text-4xl font-extrabold tracking-tight">
            <Coins className="size-6 text-coin" strokeWidth={2.4} />
            <span className="tabular-nums">{formatCoins(data?.wallet.balance ?? 0)}</span>
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="rounded-2xl bg-surface-2/70 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Wallet ID</p>
            {isPending ? (
              <Skeleton className="mt-1 h-3.5 w-24" />
            ) : (
              <p className="font-mono text-xs font-semibold">{data?.wallet.code}</p>
            )}
          </div>
          <div className="rounded-2xl bg-surface-2/70 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Total earned
            </p>
            {isPending ? (
              <Skeleton className="mt-1 ml-auto h-3.5 w-16" />
            ) : (
              <p className="text-xs font-semibold tabular-nums">
                {formatCoins(data?.wallet.totalEarned ?? 0)}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight">Available tasks</h2>
            <p className="text-xs text-muted-foreground">
              Finish the task requirement to earn coins
            </p>
          </div>
          <Link
            to="/tasks"
            className="press inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            See all <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {isError ? (
          <EmptyState
            icon={Flame}
            title="Something went wrong"
            description="We couldn't load tasks. Check your connection and try again."
            action={
              <button
                onClick={() => void refetch()}
                className="press rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Try again
              </button>
            }
          />
        ) : isPending ? (
          <div className="space-y-3">
            <TaskCardSkeleton />
            <TaskCardSkeleton />
            <TaskCardSkeleton />
          </div>
        ) : available.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No tasks right now"
            description="New earning tasks are published regularly. Check back in a little while."
          />
        ) : (
          <div className="space-y-3">
            {available.slice(0, 4).map((task, i) => (
              <TaskCard key={task.id} task={task} index={i} />
            ))}
          </div>
        )}
      </section>

      {(data?.activity.length ?? 0) > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-base font-bold tracking-tight">Recent activity</h2>
          <div className="divide-y divide-border overflow-hidden rounded-3xl surface-card">
            {data!.activity.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/15">
                  <TrendingUp className="size-4 text-success" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.reason}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {relativeTime(item.createdAt)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-coin tabular-nums">
                  +{formatCoins(item.amount)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
