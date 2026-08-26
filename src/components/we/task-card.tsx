import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Play, Users } from "lucide-react";

import { CoinPill } from "@/components/we/coin";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration, thumbnailFor } from "@/lib/youtube";

export type FeedTask = {
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

export function TaskCard({ task, index = 0 }: { task: FeedTask; index?: number }) {
  const progress = Math.min(100, Math.round((task.completedCount / task.completionLimit) * 100));

  return (
    <Link
      to="/task/$taskId"
      params={{ taskId: task.id }}
      className="animate-rise press block rounded-3xl p-3 surface-card"
      style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}
    >
      <div className="flex gap-3">
        <div className="relative size-[76px] shrink-0 overflow-hidden rounded-2xl bg-surface-2">
          <img
            src={thumbnailFor(task.youtubeId)}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
            {task.completedByMe ? (
              <CheckCircle2 className="size-6 text-success" />
            ) : (
              <Play className="size-6 fill-white text-white" />
            )}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{task.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CoinPill amount={task.rewardCoins} prefix="+" />
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Clock className="size-3.5" />
              {formatDuration(task.durationSeconds)}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Users className="size-3.5" />
              {task.remaining} left
            </span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full brand-gradient transition-[width] duration-500"
              style={{ width: `${Math.max(4, progress)}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="rounded-3xl p-3 surface-card">
      <div className="flex gap-3">
        <Skeleton className="size-[76px] shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-2 py-1">
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-1.5 w-full" />
        </div>
      </div>
    </div>
  );
}
