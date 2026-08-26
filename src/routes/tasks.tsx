import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CircleAlert, ListVideo, Sparkles } from "lucide-react";

import { AppShell, EmptyState, ScreenHeader } from "@/components/we/app-shell";
import { TaskCard, TaskCardSkeleton } from "@/components/we/task-card";
import { useFeed } from "@/lib/use-watch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — WATCH EARN" },
      {
        name: "description",
        content:
          "Browse every live WATCH EARN task, see the reward in virtual coins, the required duration and remaining completion slots.",
      },
      { property: "og:title", content: "Live Tasks — WATCH EARN" },
      {
        property: "og:description",
        content: "Pick a task, complete the requirement and collect virtual coins.",
      },
    ],
  }),
  component: TasksScreen,
});

const FILTERS = ["All", "Quick", "High reward"] as const;

function TasksScreen() {
  const { data, isPending, isError, refetch } = useFeed();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const all = (data?.tasks ?? []).filter((t) => !t.completedByMe);
  const tasks = all.filter((t) => {
    if (filter === "Quick") return t.durationSeconds <= 60;
    if (filter === "High reward") return t.rewardCoins >= 5000;
    return true;
  });

  return (
    <AppShell>
      <ScreenHeader
        title="Tasks"
        subtitle={
          isPending ? "Loading live tasks…" : `${all.length} task${all.length === 1 ? "" : "s"} live now`
        }
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "press shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-surface-2/70 text-muted-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {isError ? (
        <EmptyState
          icon={CircleAlert}
          title="Something went wrong"
          description="We couldn't load the task list. Please try again."
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
          {[0, 1, 2, 3, 4].map((i) => (
            <TaskCardSkeleton key={i} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={all.length === 0 ? Sparkles : ListVideo}
          title={all.length === 0 ? "No tasks available" : "No tasks in this filter"}
          description={
            all.length === 0
              ? "You're all caught up. New earning tasks are added regularly."
              : "Try a different filter to see more earning tasks."
          }
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task, i) => (
            <TaskCard key={task.id} task={task} index={i} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
