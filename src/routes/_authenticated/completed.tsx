import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleCheckBig } from "lucide-react";

import { AppShell, EmptyState, ScreenHeader } from "@/components/we/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useWalletOverview } from "@/lib/use-watch";
import { formatDateTime } from "@/lib/wallet-client";
import { formatCoins, thumbnailFor } from "@/lib/youtube";

export const Route = createFileRoute("/_authenticated/completed")({
  head: () => ({
    meta: [
      { title: "Completed Tasks — WATCH EARN" },
      {
        name: "description",
        content:
          "Review every WATCH EARN task you have finished, the virtual coins earned and the exact completion date.",
      },
      { property: "og:title", content: "Completed Tasks — WATCH EARN" },
      {
        property: "og:description",
        content: "Your finished tasks and the coins they earned.",
      },
    ],
  }),
  component: CompletedScreen,
});

function CompletedScreen() {
  const { data, isPending } = useWalletOverview();
  const items = data?.completions ?? [];
  const total = items.reduce((sum, c) => sum + c.coins, 0);

  return (
    <AppShell>
      <ScreenHeader
        title="Completed"
        subtitle={
          isPending
            ? "Loading your history…"
            : `${items.length} task${items.length === 1 ? "" : "s"} · ${formatCoins(total)} coins earned`
        }
      />

      {isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 rounded-3xl p-3 surface-card">
              <Skeleton className="size-[68px] rounded-2xl" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={CircleCheckBig}
          title="Nothing completed yet"
          description="Finish your first task to start building your reward history."
          action={
            <Link
              to="/tasks"
              className="press inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Browse tasks
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((c, i) => (
            <div
              key={c.id}
              className="animate-rise flex gap-3 rounded-3xl p-3 surface-card"
              style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
            >
              <div className="relative size-[68px] shrink-0 overflow-hidden rounded-2xl bg-surface-2">
                {c.youtubeId ? (
                  <img
                    src={thumbnailFor(c.youtubeId)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover opacity-70"
                  />
                ) : null}
                <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                  <CircleCheckBig className="size-6 text-success" strokeWidth={2.4} />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold leading-snug">{c.title}</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {formatDateTime(c.createdAt)}
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                    Completed
                  </span>
                  <span className="text-xs font-bold text-coin tabular-nums">
                    +{formatCoins(c.coins)} coins
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
