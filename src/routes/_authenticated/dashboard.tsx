import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BUCKETS, bucketColor, bucketLabel } from "@/lib/buckets";
import { StickyNote, Bell, CalendarDays, KeyRound } from "lucide-react";
import { formatDistanceToNow, startOfDay, subDays } from "date-fns";
import { formatIST } from "@/lib/tz";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Mind" }] }),
  component: Dashboard,
});

function Dashboard() {
  const notes = useQuery({
    queryKey: ["notes-recent"],
    queryFn: async () =>
      (await supabase.from("notes").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [],
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

  const stats = [
    { label: "Notes", value: notes.data?.length ?? 0, icon: StickyNote, to: "/notes" as const },
    {
      label: "Reminders",
      value: reminders.data?.length ?? 0,
      icon: Bell,
      to: "/calendar" as const,
    },
    { label: "Events", value: events.data?.length ?? 0, icon: CalendarDays, to: "/calendar" as const },
    { label: "Vault", value: credCount.data ?? 0, icon: KeyRound, to: "/vault" as const },
  ];

  // productivity: notes per day, last 7 days
  const days = Array.from({ length: 7 }).map((_, i) => startOfDay(subDays(new Date(), 6 - i)));
  const byDay = days.map((d) => {
    const next = new Date(d.getTime() + 86400000);
    const count = (notes.data ?? []).filter((n) => {
      const t = new Date(n.created_at).getTime();
      return t >= d.getTime() && t < next.getTime();
    }).length;
    return { day: d, count };
  });
  const max = Math.max(1, ...byDay.map((d) => d.count));

  // bucket distribution
  const bucketCounts = BUCKETS.map((b) => ({
    ...b,
    count: (notes.data ?? []).filter((n) => n.bucket === b.id).length,
  })).filter((b) => b.count > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), "EEEE, MMMM d")} — here's your day.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              to={s.to}
              className="rounded-xl border bg-card p-4 hover:bg-accent transition-colors"
            >
              <Icon className="size-4 text-muted-foreground" />
              <div className="mt-3 text-2xl font-semibold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Productivity — last 7 days</h2>
            <span className="text-xs text-muted-foreground">notes captured</span>
          </div>
          <div className="flex items-end gap-2 h-32">
            {byDay.map((d) => (
              <div key={d.day.toISOString()} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{ height: `${(d.count / max) * 100}%`, minHeight: 4 }}
                  title={`${d.count} notes`}
                />
                <div className="text-[10px] text-muted-foreground">{format(d.day, "EEE")}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
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
                  <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${(b.count / (notes.data?.length || 1)) * 100}%`,
                        background: b.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-3">Upcoming reminders</h2>
          {reminders.data?.length ? (
            <ul className="space-y-2">
              {reminders.data.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="min-w-0">
                    <div className="text-sm truncate">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.due_at), { addSuffix: true })}
                    </div>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
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

        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold mb-3">Recent notes</h2>
          {notes.data?.length ? (
            <ul className="space-y-2">
              {notes.data.slice(0, 6).map((n) => (
                <li key={n.id} className="py-2 border-b last:border-0">
                  <div className="text-sm line-clamp-2">{n.content}</div>
                  <div className="text-xs text-muted-foreground mt-1">
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
    </div>
  );
}
