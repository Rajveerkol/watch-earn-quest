import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CircleAlert, Loader2, Lock, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin Sign In — WATCH EARN" },
      {
        name: "description",
        content:
          "Secure administrator sign in for the WATCH EARN console: manage tasks, rewards and platform analytics.",
      },
      { property: "og:title", content: "Admin Sign In — WATCH EARN" },
      { property: "og:description", content: "Administrator access to the WATCH EARN console." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/admin" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (signUpError) throw signUpError;
        setNotice("Account created. Confirm your email if prompted, then sign in.");
        setMode("signin");
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      void navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-5">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl brand-gradient">
            <ShieldCheck className="size-6 text-white" strokeWidth={2.4} />
          </span>
          <h1 className="mt-4 text-xl font-extrabold tracking-tight">WATCH EARN Console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administrator access only. Sign in with the configured admin email.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-3xl p-5 surface-card">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="h-11 rounded-xl bg-surface-2/60"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              maxLength={200}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 rounded-xl bg-surface-2/60"
            />
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-xl bg-destructive/12 px-3 py-2 text-xs text-destructive">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </p>
          )}
          {notice && (
            <p className="rounded-xl bg-success/12 px-3 py-2 text-xs text-success">{notice}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="press flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-primary-foreground brand-gradient disabled:opacity-70"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
            {mode === "signin" ? "Sign in" : "Create admin account"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            className="w-full text-center text-xs font-semibold text-muted-foreground"
          >
            {mode === "signin"
              ? "First time? Create the admin account"
              : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
