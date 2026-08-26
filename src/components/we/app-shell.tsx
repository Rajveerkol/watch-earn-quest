import { Link, useRouterState } from "@tanstack/react-router";
import { CircleCheckBig, Home, ListVideo, Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/tasks", label: "Tasks", icon: ListVideo },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/completed", label: "Done", icon: CircleCheckBig },
] as const;

export function AppShell({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[440px] flex-col overflow-x-hidden">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-0 mx-auto h-72 max-w-[440px] opacity-60 blur-3xl brand-gradient"
          style={{ maskImage: "linear-gradient(to bottom, black, transparent)" }}
        />
        <main
          className={cn(
            "relative z-10 flex-1 px-4 pt-4",
            hideNav ? "pb-8" : "pb-[calc(6.5rem+env(safe-area-inset-bottom))]",
          )}
        >
          {children}
        </main>

        {!hideNav && (
          <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[440px] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between gap-1 rounded-3xl p-1.5 backdrop-blur-xl surface-card">
              {NAV.map(({ to, label, icon: Icon }) => {
                const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    aria-label={label}
                    className={cn(
                      "press flex flex-1 flex-col items-center gap-1 rounded-2xl py-2.5 text-[10px] font-semibold tracking-wide",
                      active
                        ? "bg-primary/18 text-primary-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <Icon
                      className={cn("size-5", active ? "text-primary" : "")}
                      strokeWidth={active ? 2.4 : 1.8}
                    />
                    <span className={active ? "text-foreground" : ""}>{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Home;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="animate-rise flex flex-col items-center rounded-3xl px-6 py-12 text-center surface-card">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/15">
        <Icon className="size-7 text-primary" />
      </div>
      <p className="text-base font-semibold">{title}</p>
      <p className="mt-1.5 text-sm text-muted-foreground text-balance-tight">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
