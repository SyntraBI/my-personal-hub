import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BUCKETS, bucketColor, bucketLabel } from "@/lib/buckets";
import { StickyNote, Bell, CalendarDays, KeyRound, Flame, TrendingUp } from "lucide-react";
import { formatDistanceToNow, startOfDay, subDays } from "date-fns";
import { formatIST, dayKeyIST } from "@/lib/tz";
import { FocusTimer } from "@/components/FocusTimer";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Mind" },
      { name: "description", content: "Your personal command center — notes, reminders, focus, and streaks." },
      { property: "og:title", content: "Mind — Dashboard" },
      { property: "og:description", content: "Your personal command center." },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const h = Number(formatIST(new Date(), "H"));
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Winding down";
}

function Dashboard() {
  const notes = useQuery({
    queryKey: ["notes-recent"],
    queryFn: async () =>
      (await supabase.from("notes").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  const reminders = useQuery({
    queryKey: ["reminders-upcoming"],
    queryFn: async () =>
      (
        await supabase
          .from("reminders")
          .select("*")
          .eq("done", false)
          .order("due_at", { ascending: true })
          .limit(6)
      ).data ?? [],
  });
  const events = useQuery({
    queryKey: ["events-upcoming"],
    queryFn: async () =>
      (
        await supabase
          .from("events")
          .select("*")
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(6)
      ).data ?? [],
  });
  const credCount = useQuery({
    queryKey: ["cred-count"],
    queryFn: async () =>
      (await supabase.from("credentials").select("*", { count: "exact", head: true })).count ?? 0,
  });

  const allNotes = notes.data ?? [];

  // Streak: consecutive days with ≥ 1 note (IST)
  const noteDays = new Set(allNotes.map((n) => dayKeyIST(n.created_at)));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const key = dayKeyIST(subDays(new Date(), i));
    if (noteDays.has(key)) streak++;
    else if (i > 0) break;
    else continue; // today no note yet, keep counting from yesterday
  }

  const stats = [
    { label: "Notes", value: allNotes.length, icon: StickyNote, to: "/notes" as const, tint: "oklch(0.75 0.15 250)" },
    { label: "Reminders", value: reminders.data?.length ?? 0, icon: Bell, to: "/calendar" as const, tint: "oklch(0.78 0.17 158)" },
    { label: "Events", value: events.data?.length ?? 0, icon: CalendarDays, to: "/calendar" as const, tint: "oklch(0.83 0.14 85)" },
    { label: "Vault", value: credCount.data ?? 0, icon: KeyRound, to: "/vault" as const, tint: "oklch(0.75 0.18 320)" },
  ];

  const days = Array.from({ length: 7 }).map((_, i) => startOfDay(subDays(new Date(), 6 - i)));
  const byDay = days.map((d) => {
    const next = new Date(d.getTime() + 86400000);
    const count = allNotes.filter((n) => {
      const t = new Date(n.created_at).getTime();
      return t >= d.getTime() && t < next.getTime();
    }).length;
    return { day: d, count };
  });
  const max = Math.max(1, ...byDay.map((d) => d.count));
  const weekTotal = byDay.reduce((s, d) => s + d.count, 0);

  const bucketCounts = BUCKETS.map((b) => ({
    ...b,
    count: allNotes.filter((n) => n.bucket === b.id).length,
  })).filter((b) => b.count > 0);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {formatIST(new Date(), "EEEE · MMMM d")}
          </p>
          <h1 className="font-display text-4xl md:text-5xl mt-2">
            {greeting()}, <span className="text-gradient">friend</span>.
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {reminders.data?.length
              ? `${reminders.data.length} reminder${reminders.data.length > 1 ? "s" : ""} on deck.`
              : "Your calendar is clear. Capture a thought with the mic below."}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/60 px-4 py-3 shadow-elegant">
          <Flame className="size-5 text-[oklch(0.83_0.14_85)]" />
          <div>
            <div className="font-display text-2xl leading-none">{streak}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
              day streak
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              to={s.to}
              className="rounded-2xl border border-border/60 bg-card/60 p-4 hover:bg-accent/40 transition-all hover:-translate-y-0.5 hover:shadow-elegant relative overflow-hidden group"
            >
              <div
                className="absolute -top-8 -right-8 size-24 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity"
                style={{ background: s.tint }}
              />
              <Icon className="size-4 text-muted-foreground relative" style={{ color: s.tint }} />
              <div className="mt-4 font-display text-3xl relative">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5 relative">{s.label}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <FocusTimer />

        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-elegant">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <h2 className="font-semibold">Last 7 days</h2>
            </div>
            <span className="text-xs text-muted-foreground">{weekTotal} captured</span>
          </div>
          <div className="flex items-end gap-2 h-32">
            {byDay.map((d) => (
              <div key={d.day.toISOString()} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t-md bg-gradient-primary transition-all"
                  style={{ height: `${(d.count / max) * 100}%`, minHeight: 4, opacity: 0.4 + (d.count / max) * 0.6 }}
                  title={`${d.count} notes`}
                />
                <div className="text-[10px] text-muted-foreground">{formatIST(d.day, "EEE")}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <h2 className="font-semibold mb-4">Focus by bucket</h2>
          {bucketCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet. Try the mic below.</p>
          ) : (
            <div className="space-y-3">
              {bucketCounts.map((b) => (
                <div key={b.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{b.label}</span>
                    <span className="text-muted-foreground">{b.count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(b.count / (allNotes.length || 1)) * 100}%`,
                        background: b.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
          <h2 className="font-semibold mb-3">Upcoming reminders</h2>
          {reminders.data?.length ? (
            <ul className="space-y-1">
              {reminders.data.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 py-2 border-b border-border/40 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="text-sm truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.due_at), { addSuffix: true })}
                    </div>
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: bucketColor(r.bucket) + "22", color: bucketColor(r.bucket) }}
                  >
                    {bucketLabel(r.bucket)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
        <h2 className="font-semibold mb-3">Recent notes</h2>
        {allNotes.length ? (
          <ul className="grid md:grid-cols-2 gap-2">
            {allNotes.slice(0, 6).map((n) => (
              <li key={n.id} className="p-3 rounded-lg border border-border/40 hover:bg-accent/30 transition-colors">
                <div className="text-sm line-clamp-2">{n.content}</div>
                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                  <span
                    className="inline-block size-1.5 rounded-full"
                    style={{ background: bucketColor(n.bucket) }}
                  />
                  {bucketLabel(n.bucket)} · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        )}
      </div>
    </div>
  );
}
