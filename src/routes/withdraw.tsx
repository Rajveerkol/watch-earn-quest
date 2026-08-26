import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  CircleAlert,
  Clock3,
  Coins,
  Landmark,
  XCircle,
} from "lucide-react";

import { AppShell, EmptyState, ScreenHeader } from "@/components/we/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequestWithdrawal, useWithdrawals } from "@/lib/use-watch";
import { formatDateTime } from "@/lib/wallet-client";
import { COINS_PER_RUPEE, formatCoins } from "@/lib/youtube";

const MIN_WITHDRAW = 5000;

export const Route = createFileRoute("/withdraw")({
  head: () => ({
    meta: [
      { title: "Withdraw Coins — WATCH EARN" },
      {
        name: "description",
        content:
          "Request a WATCH EARN coin withdrawal to your bank account. Minimum 5,000 coins, with full request and transaction history.",
      },
      { property: "og:title", content: "Withdraw Coins — WATCH EARN" },
      {
        property: "og:description",
        content: "Cash out your virtual coins: minimum 5,000 coins per request.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WithdrawScreen,
});

function WithdrawScreen() {
  const { data, isPending } = useWithdrawals();
  const request = useRequestWithdrawal();

  const [coins, setCoins] = useState(String(MIN_WITHDRAW));
  const [holderName, setHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const balance = data?.balance ?? 0;
  const pending = (data?.withdrawals ?? []).some((w) => w.status === "pending");
  const amount = Number(coins);

  const submit = async () => {
    setError(null);
    setDone(false);
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < MIN_WITHDRAW) {
      setError(`Minimum withdrawal is ${formatCoins(MIN_WITHDRAW)} coins.`);
      return;
    }
    if (amount > balance) {
      setError("You do not have enough coins for this withdrawal.");
      return;
    }
    if (!/^\d{6,20}$/.test(accountNumber.trim())) {
      setError("Enter a valid bank account number (6–20 digits).");
      return;
    }
    if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifscCode.trim())) {
      setError("Enter a valid 11-character IFSC code, e.g. HDFC0001234.");
      return;
    }
    if (holderName.trim().length < 2) {
      setError("Enter the account holder name.");
      return;
    }
    const res = await request.mutateAsync({
      coins: amount,
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      holderName: holderName.trim(),
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDone(true);
    setAccountNumber("");
    setIfscCode("");
    setHolderName("");
    setCoins(String(MIN_WITHDRAW));
  };

  return (
    <AppShell>
      <ScreenHeader
        title="Withdraw Coins"
        subtitle={`Minimum ${formatCoins(MIN_WITHDRAW)} coins per request`}
      />

      <section className="animate-rise relative overflow-hidden rounded-3xl p-5 surface-card">
        <div
          aria-hidden
          className="absolute -right-10 -top-12 size-40 rounded-full opacity-25 blur-2xl brand-gradient"
        />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Available to withdraw
        </p>
        {isPending ? (
          <Skeleton className="mt-3 h-10 w-40" />
        ) : (
          <p className="mt-2 flex items-baseline gap-2 text-4xl font-extrabold leading-none tracking-tight">
            <Coins className="size-6 text-coin" strokeWidth={2.4} />
            <span className="tabular-nums">{formatCoins(balance)}</span>
          </p>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Reference value: {formatCoins(COINS_PER_RUPEE)} coins = ₹1
        </p>
      </section>

      {pending ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-warning/30 bg-warning/10 p-3.5 text-xs">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-muted-foreground">
            You already have a request in review. You can send a new one once it is processed.
          </p>
        </div>
      ) : (
        <section className="mt-5 space-y-3.5 rounded-3xl p-4 surface-card">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Landmark className="size-4 text-primary" />
            Bank details
          </h2>

          <div className="space-y-1.5">
            <Label htmlFor="coins" className="text-[11px] uppercase tracking-wider">
              Coins to withdraw
            </Label>
            <Input
              id="coins"
              inputMode="numeric"
              value={coins}
              onChange={(e) => setCoins(e.target.value.replace(/[^\d]/g, ""))}
              className="h-11 rounded-xl"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {[5000, 10000, 25000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setCoins(String(v))}
                  className="press rounded-full bg-surface-2 px-3 py-1 text-[11px] font-semibold"
                >
                  {formatCoins(v)}
                </button>
              ))}
              {balance >= MIN_WITHDRAW ? (
                <button
                  type="button"
                  onClick={() => setCoins(String(balance))}
                  className="press rounded-full bg-primary/15 px-3 py-1 text-[11px] font-semibold text-primary"
                >
                  Max
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="holder" className="text-[11px] uppercase tracking-wider">
              Account holder name
            </Label>
            <Input
              id="holder"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="As printed in your bank records"
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="account" className="text-[11px] uppercase tracking-wider">
              Account number
            </Label>
            <Input
              id="account"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="e.g. 123456789012"
              className="h-11 rounded-xl tracking-wider"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ifsc" className="text-[11px] uppercase tracking-wider">
              IFSC code
            </Label>
            <Input
              id="ifsc"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase().slice(0, 11))}
              placeholder="e.g. HDFC0001234"
              className="h-11 rounded-xl uppercase tracking-wider"
            />
          </div>

          {error ? (
            <p className="flex items-start gap-2 text-xs font-medium text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : null}
          {done ? (
            <p className="flex items-start gap-2 text-xs font-medium text-success">
              <BadgeCheck className="mt-0.5 size-4 shrink-0" />
              Withdrawal request submitted. Coins are held until it is reviewed.
            </p>
          ) : null}

          <Button
            onClick={submit}
            disabled={request.isPending || balance < MIN_WITHDRAW}
            className="h-12 w-full rounded-2xl text-sm font-bold"
          >
            {request.isPending ? "Submitting…" : "Request withdrawal"}
          </Button>
          {balance < MIN_WITHDRAW ? (
            <p className="text-center text-[11px] text-muted-foreground">
              Earn {formatCoins(MIN_WITHDRAW - balance)} more coins to unlock withdrawals.{" "}
              <Link to="/tasks" className="font-semibold text-primary">
                Browse tasks
              </Link>
            </p>
          ) : null}
        </section>
      )}

      <h2 className="mt-7 mb-3 text-sm font-bold">Withdrawal history</h2>
      {isPending ? (
        <div className="space-y-3 rounded-3xl p-4 surface-card">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      ) : (data?.withdrawals.length ?? 0) === 0 ? (
        <EmptyState
          icon={Banknote}
          title="No withdrawals yet"
          description="Your requests, their status and bank reference will be listed here."
        />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-3xl surface-card">
          {data!.withdrawals.map((w) => (
            <div key={w.id} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2">
                {w.status === "pending" ? (
                  <Clock3 className="size-4 text-warning" />
                ) : w.status === "rejected" ? (
                  <XCircle className="size-4 text-destructive" />
                ) : (
                  <BadgeCheck className="size-4 text-success" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tabular-nums">
                  {formatCoins(w.coins)} coins
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  ••••{w.accountLast4} · {w.ifscCode} · {formatDateTime(w.createdAt)}
                </p>
                {w.adminNote ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">Note: {w.adminNote}</p>
                ) : null}
              </div>
              <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                {w.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <Link
        to="/wallet"
        className="press mt-6 flex items-center justify-center gap-1.5 rounded-2xl bg-surface-2/70 py-3 text-xs font-semibold"
      >
        Back to wallet <ArrowUpRight className="size-3.5" />
      </Link>
    </AppShell>
  );
}
