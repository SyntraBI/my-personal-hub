import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Mic, KeyRound, CalendarDays, StickyNote } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Mind" },
      { name: "description", content: "Sign in to your personal assistant." },
    ],
  }),
  component: AuthPage,
});

function toEmail(idOrEmail: string) {
  const v = idOrEmail.trim();
  if (v.includes("@")) return v.toLowerCase();
  return `${v.toLowerCase()}@mind.local`;
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [identifier, setIdentifier] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signInOrCreate(email: string, pwd: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (!error) return;
    const msg = error.message.toLowerCase();
    const missing = msg.includes("invalid login") || msg.includes("invalid credentials");
    if (!missing) throw error;
    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password: pwd,
      options: { emailRedirectTo: window.location.origin },
    });
    if (signUpErr && !signUpErr.message.toLowerCase().includes("registered")) throw signUpErr;
    const { error: retryErr } = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (retryErr) throw retryErr;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const email = toEmail(identifier);
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      }
      await signInOrCreate(email, password);
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: Mic, label: "Voice-first capture" },
    { icon: StickyNote, label: "AI-bucketed notes" },
    { icon: CalendarDays, label: "Natural-language reminders" },
    { icon: KeyRound, label: "Private credential vault" },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background text-foreground relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 surface-glow" />
      <div className="pointer-events-none absolute -top-40 -left-40 size-[600px] rounded-full blur-3xl opacity-30 bg-gradient-primary" />

      <div className="hidden lg:flex flex-col justify-between p-12 relative">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="size-9 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-xl leading-none">Mind</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
              Personal OS
            </div>
          </div>
        </Link>

        <div className="max-w-md">
          <h2 className="font-display text-5xl leading-tight">
            Your <span className="text-gradient">second brain</span>, always listening.
          </h2>
          <p className="text-muted-foreground mt-4">
            Speak your day into being — notes, reminders, and secrets, sorted the moment you say them.
          </p>
          <ul className="mt-8 space-y-3">
            {features.map((f) => (
              <li key={f.label} className="flex items-center gap-3 text-sm">
                <div className="size-8 rounded-lg border border-border/60 bg-card/60 grid place-items-center">
                  <f.icon className="size-4 text-primary" />
                </div>
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Mind — private by default.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-10 relative">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="size-8 rounded-lg bg-gradient-primary grid place-items-center">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg">Mind</span>
          </Link>
          <div className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-7 shadow-elegant">
            <h1 className="font-display text-2xl">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin"
                ? "Sign in with your user ID or email."
                : "Your notes, reminders and vault — all yours."}
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">User ID or email</Label>
                <Input
                  id="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  placeholder="admin"
                  className="bg-background/50 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="bg-background/50 border-border/60"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-primary text-primary-foreground border-0 shadow-glow"
                disabled={loading}
              >
                {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <p className="mt-3 text-[11px] text-muted-foreground text-center">
              Default: <span className="font-mono text-foreground/80">admin</span> /{" "}
              <span className="font-mono text-foreground/80">123456</span>
            </p>
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground w-full text-center"
            >
              {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
