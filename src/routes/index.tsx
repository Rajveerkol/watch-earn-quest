import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  CircleAlert,
  Coins,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { signUpAccount, USERNAME_RULE, usernameToEmail } from "@/lib/account.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WATCH EARN — Earn Virtual Coins For Simple Tasks" },
      {
        name: "description",
        content:
          "Create a WATCH EARN account with a user ID and password, complete short video tasks and collect virtual coins in your personal wallet.",
      },
      { property: "og:title", content: "WATCH EARN — Mobile Rewards Platform" },
      {
        property: "og:description",
        content:
          "Sign in with your user ID, complete simple tasks and collect virtual coins in your own wallet.",
      },
    ],
  }),
  component: LandingScreen,
});

const HIGHLIGHTS = [
  { icon: Zap, title: "Quick tasks", copy: "60-second video tasks, instant coin credit." },
  { icon: Wallet, title: "Own wallet", copy: "Coins stay tied to your login — never mixed up." },
  { icon: ShieldCheck, title: "Safe payouts", copy: "Withdraw from 5,000 coins to your bank." },
];

function LandingScreen() {
  const navigate = useNavigate();
  const signUp = useServerFn(signUpAccount);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const id = username.trim().toLowerCase();
    if (!USERNAME_RULE.test(id)) {
      setError("User ID must be 3–20 characters: lowercase letters, numbers or underscore.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await signUp({ data: { username: id, password } });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setNotice("Account created. Signing you in…");
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(id),
        password,
      });
      if (signInError) {
        setError(
          mode === "signin"
            ? "Wrong user ID or password. Please try again."
            : "Account created, but sign in failed. Try signing in now.",
        );
        return;
      }
      void navigate({ to: "/home", replace: true });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[130%] -translate-x-1/2 rounded-[50%] opacity-25 blur-3xl brand-gradient"
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-5 pb-10 pt-10">
        <header className="animate-rise text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl shadow-lg brand-gradient">
            <Coins className="size-7 text-white" strokeWidth={2.3} />
          </span>
          <h1 className="mt-4 text-[26px] font-extrabold leading-tight tracking-tight">
            WATCH <span className="text-primary">EARN</span>
          </h1>
          <p className="mx-auto mt-2 max-w-[19rem] text-sm text-muted-foreground text-balance-tight">
            Complete simple video tasks, collect virtual coins and withdraw to your bank.
          </p>
        </header>

        <form
          onSubmit={submit}
          className="animate-rise mt-7 space-y-4 rounded-3xl p-5 surface-card"
        >
          <div className="flex rounded-2xl bg-surface-2 p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setNotice(null);
                }}
                className={cn(
                  "press flex-1 rounded-xl py-2.5 text-sm font-bold",
                  mode === m
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs font-semibold">
              User ID
            </Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={20}
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
                placeholder="rajveer_01"
                className="h-12 rounded-2xl bg-surface-2/70 pl-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold">
              Password
            </Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="h-12 rounded-2xl bg-surface-2/70 pl-10"
              />
            </div>
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-2xl bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-2xl bg-success/12 px-3 py-2.5 text-xs font-medium text-success">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="press flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 brand-gradient disabled:opacity-70"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {mode === "signin" ? "Sign in & start earning" : "Create my account"}
          </button>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            Your coins are virtual website credits linked to this user ID. 1,000 coins = ₹1
            reference value.
          </p>
        </form>

        <section className="mt-7 grid gap-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, copy }, i) => (
            <div
              key={title}
              className="animate-rise flex items-center gap-3 rounded-2xl p-4 surface-card"
              style={{ animationDelay: `${80 * i}ms` }}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl brand-soft">
                <Icon className="size-5 text-primary" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold">{title}</p>
                <p className="text-xs text-muted-foreground">{copy}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
