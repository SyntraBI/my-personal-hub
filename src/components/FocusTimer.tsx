import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Coffee, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FOCUS_MIN = 25;
const BREAK_MIN = 5;

type Mode = "focus" | "break";

export function FocusTimer() {
  const [mode, setMode] = useState<Mode>("focus");
  const [remaining, setRemaining] = useState(FOCUS_MIN * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(() => {
    if (typeof window === "undefined") return 0;
    const stored = localStorage.getItem("focus-sessions-" + new Date().toDateString());
    return stored ? parseInt(stored, 10) : 0;
  });
  const tick = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    tick.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (mode === "focus") {
            const next = sessions + 1;
            setSessions(next);
            localStorage.setItem("focus-sessions-" + new Date().toDateString(), String(next));
            toast.success("Focus complete — take a breather.");
            setMode("break");
            return BREAK_MIN * 60;
          }
          toast.success("Break over — back to focus.");
          setMode("focus");
          return FOCUS_MIN * 60;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (tick.current) window.clearInterval(tick.current);
    };
  }, [running, mode, sessions]);

  const total = (mode === "focus" ? FOCUS_MIN : BREAK_MIN) * 60;
  const progress = 1 - remaining / total;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  function reset() {
    setRunning(false);
    setRemaining((mode === "focus" ? FOCUS_MIN : BREAK_MIN) * 60);
  }

  const size = 128;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-elegant relative overflow-hidden">
      <div className="absolute inset-0 surface-glow opacity-60 pointer-events-none" />
      <div className="relative flex items-center gap-5">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="var(--color-border)"
              strokeWidth={stroke}
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="url(#focus-grad)"
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - progress)}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
            <defs>
              <linearGradient id="focus-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="oklch(0.78 0.17 158)" />
                <stop offset="100%" stopColor="oklch(0.83 0.14 85)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-display text-3xl leading-none">
              {mm}:{ss}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1 flex items-center gap-1">
              {mode === "focus" ? <Brain className="size-3" /> : <Coffee className="size-3" />}
              {mode}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Focus session</h3>
            <span className="text-xs text-muted-foreground">
              {sessions} today
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            25 min deep work · 5 min break. Build momentum.
          </p>
          <div className="flex items-center gap-2 mt-4">
            <Button
              size="sm"
              onClick={() => setRunning((r) => !r)}
              className={cn(
                "bg-gradient-primary text-primary-foreground border-0 shadow-glow",
                running && "opacity-90",
              )}
            >
              {running ? <Pause className="size-4" /> : <Play className="size-4" />}
              {running ? "Pause" : "Start"}
            </Button>
            <Button size="sm" variant="outline" onClick={reset}>
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
