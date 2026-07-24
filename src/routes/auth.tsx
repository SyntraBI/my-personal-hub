import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Mind" },
      { name: "description", content: "Sign in to your personal assistant." },
    ],
  }),
  component: AuthPage,
});

// Map a username (like "admin") to a synthetic email Supabase can store.
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
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signInOrCreate(email: string, pwd: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (!error) return;
    // If credentials invalid (e.g. account doesn't exist yet), try to create it then sign in.
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <Sparkles className="size-5 text-primary" />
          <span className="font-semibold tracking-tight">Mind</span>
        </Link>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <p className="mt-3 text-[11px] text-muted-foreground text-center">
            Default: <span className="font-mono">admin</span> / <span className="font-mono">123456</span>
          </p>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground w-full text-center"
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
