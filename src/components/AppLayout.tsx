import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  StickyNote,
  CalendarDays,
  KeyRound,
  LogOut,
  Sparkles,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceBar } from "@/components/VoiceBar";
import { CommandPalette } from "@/components/CommandPalette";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/notes", label: "Notes", icon: StickyNote },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/vault", label: "Vault", icon: KeyRound },
] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  function openPalette() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }),
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex relative">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 surface-glow" />
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 h-[500px] w-[900px] rounded-full blur-3xl opacity-20 bg-gradient-primary -z-10" />

      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar/60 backdrop-blur-xl">
        <div className="p-5 flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <div>
            <div className="font-display text-lg leading-none">Mind</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
              Personal OS
            </div>
          </div>
        </div>

        <button
          onClick={openPalette}
          className="mx-3 mt-2 flex items-center gap-2 rounded-lg border border-border/60 bg-card/50 px-3 py-2 text-xs text-muted-foreground hover:bg-accent transition-colors"
        >
          <Command className="size-3.5" />
          <span>Search everything</span>
          <kbd className="ml-auto text-[10px] font-mono border border-border/60 rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </button>

        <nav className="px-3 mt-4 flex-1 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all relative overflow-hidden group",
                  active
                    ? "text-foreground bg-accent/80 shadow-sm"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-gradient-primary" />
                )}
                <Icon className={cn("size-4", active && "text-primary")} />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border/60">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden border-b border-border/60 flex items-center justify-between px-4 py-3 bg-background/70 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-gradient-primary grid place-items-center">
              <Sparkles className="size-3.5 text-primary-foreground" />
            </div>
            <span className="font-display text-base">Mind</span>
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
                    active ? "bg-accent text-primary" : "text-muted-foreground",
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

      <CommandPalette />
      <Toaster />
    </div>
  );
}
