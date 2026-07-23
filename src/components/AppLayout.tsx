import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  StickyNote,
  CalendarDays,
  KeyRound,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceBar } from "@/components/VoiceBar";
import { Toaster } from "@/components/ui/sonner";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/notes", label: "Notes", icon: StickyNote },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/vault", label: "Vault", icon: KeyRound },
] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card/40">
        <div className="p-5 flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          <span className="font-semibold tracking-tight">Mind</span>
        </div>
        <nav className="px-3 flex-1 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={signOut}
          className="m-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden border-b flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm font-semibold">Mind</span>
          </div>
          <div className="flex items-center gap-1">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = location.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  aria-label={n.label}
                  className={cn(
                    "p-2 rounded-md",
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">{children}</div>
        </div>

        <VoiceBar />
      </main>
      <Toaster />
    </div>
  );
}
