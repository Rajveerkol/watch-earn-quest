import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Banknote, Check, Coins, Copy, Receipt, ShieldCheck } from "lucide-react";

import { AppShell, EmptyState, ScreenHeader } from "@/components/we/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWalletOverview } from "@/lib/use-watch";
import { formatDateTime } from "@/lib/wallet-client";
import { COINS_PER_RUPEE, formatCoins } from "@/lib/youtube";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "My Wallet — WATCH EARN" },
      {
        name: "description",
        content:
          "Track your WATCH EARN virtual coin balance, wallet ID, total earned coins, reward history and every credit transaction.",
      },
      { property: "og:title", content: "My Wallet — WATCH EARN" },
      {
        property: "og:description",
        content: "Your anonymous wallet: balance, reward history and transactions.",
      },
    ],
  }),
  component: WalletScreen,
});

function WalletScreen() {
  const { data, isPending } = useWalletOverview();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!data?.wallet.code) return;
    try {
      await navigator.clipboard.writeText(data.wallet.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the ID is visible on screen anyway */
    }
  };

  return (
    <AppShell>
      <ScreenHeader title="My Wallet" subtitle="Virtual coins earned on WATCH EARN" />

      <section className="animate-rise relative overflow-hidden rounded-3xl p-5 surface-card">
        <div aria-hidden className="absolute -left-10 -top-12 size-40 rounded-full opacity-25 blur-2xl brand-gradient" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Current balance
        </p>
        {isPending ? (
          <Skeleton className="mt-3 h-11 w-44" />
        ) : (
          <p className="animate-pop mt-2 flex items-baseline gap-2 text-[2.6rem] font-extrabold leading-none tracking-tight">
            <Coins className="size-7 text-coin" strokeWidth={2.4} />
            <span className="tabular-nums">{formatCoins(data?.wallet.balance ?? 0)}</span>
          </p>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Virtual Coins · reference {formatCoins(COINS_PER_RUPEE)} coins = ₹1
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => void copy()}
            className="press flex items-center justify-between gap-2 rounded-2xl bg-surface-2/70 px-3 py-2.5 text-left"
          >
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
                Wallet ID
              </span>
              {isPending ? (
                <Skeleton className="mt-1 h-3.5 w-24" />
              ) : (
                <span className="block truncate font-mono text-xs font-semibold">
                  {data?.wallet.code}
                </span>
              )}
            </span>
            {copied ? (
              <Check className="size-4 shrink-0 text-success" />
            ) : (
              <Copy className="size-4 shrink-0 text-muted-foreground" />
            )}
          </button>
          <div className="rounded-2xl bg-surface-2/70 px-3 py-2.5">
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
              Total earned
            </span>
            {isPending ? (
              <Skeleton className="mt-1 h-3.5 w-20" />
            ) : (
              <span className="block text-xs font-semibold tabular-nums">
                {formatCoins(data?.wallet.totalEarned ?? 0)} coins
              </span>
            )}
          </div>
        </div>

        <Link
          to="/withdraw"
          className="press mt-4 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-primary-foreground brand-gradient"
        >
          <Banknote className="size-4" />
          Withdraw coins
          <ArrowUpRight className="size-4" />
        </Link>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Minimum {formatCoins(5000)} coins per withdrawal
        </p>

        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-success" />
          Balance is stored and verified on our servers
        </p>
      </section>

      <Tabs defaultValue="rewards" className="mt-6">
        <TabsList className="w-full rounded-2xl bg-surface-2/70 p-1">
          <TabsTrigger value="rewards" className="flex-1 rounded-xl text-xs font-semibold">
            Reward history
          </TabsTrigger>
          <TabsTrigger value="txns" className="flex-1 rounded-xl text-xs font-semibold">
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="mt-4">
          {isPending ? (
            <ListSkeleton />
          ) : (data?.completions.length ?? 0) === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No rewards yet"
              description="Complete your first task and your coin rewards will appear here."
            />
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-3xl surface-card">
              {data!.completions.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(c.createdAt)} · Credited
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-coin tabular-nums">
                    +{formatCoins(c.coins)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="txns" className="mt-4">
          {isPending ? (
            <ListSkeleton />
          ) : (data?.transactions.length ?? 0) === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Every coin credit will be listed here with its reference."
            />
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-3xl surface-card">
              {data!.transactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/15">
                    <ArrowDownLeft className="size-4 text-success" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.reason}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {formatDateTime(t.createdAt)}
                      {t.reference ? ` · ${t.reference}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-coin tabular-nums">
                    {t.kind === "credit" ? "+" : "-"}
                    {formatCoins(t.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3 rounded-3xl p-4 surface-card">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-3.5 w-12" />
        </div>
      ))}
    </div>
  );
}
