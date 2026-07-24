import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { formatIST, isTodayIST, isTomorrowIST } from "@/lib/tz";
import { Check, Trash2, Bell, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bucketColor, bucketLabel } from "@/lib/buckets";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Mind" }] }),
  component: CalendarPage,
});

function relativeDay(d: Date) {
  if (isTodayIST(d)) return "Today";
  if (isTomorrowIST(d)) return "Tomorrow";
  return formatIST(d, "EEE, MMM d");
}

function CalendarPage() {
  const qc = useQueryClient();
  const reminders = useQuery({
    queryKey: ["reminders"],
    queryFn: async () =>
      (await supabase.from("reminders").select("*").order("due_at", { ascending: true })).data ?? [],
  });
  const events = useQuery({
    queryKey: ["events"],
    queryFn: async () =>
      (await supabase.from("events").select("*").order("starts_at", { ascending: true })).data ?? [],
  });

  const upcomingReminders = (reminders.data ?? []).filter((r) => !r.done);
  const doneReminders = (reminders.data ?? []).filter((r) => r.done);

  async function toggleDone(id: string, done: boolean) {
    const { error } = await supabase.from("reminders").update({ done: !done }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["reminders"] });
    qc.invalidateQueries({ queryKey: ["reminders-upcoming"] });
  }
  async function removeReminder(id: string) {
    const { error } = await supabase.from("reminders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["reminders"] });
  }
  async function removeEvent(id: string) {
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reminders and events — say "remind me tomorrow at 9" to add one.
        </p>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <Bell className="size-4" />
          <h2 className="font-semibold">Reminders</h2>
        </div>
        {upcomingReminders.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">
            Nothing to remember right now.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {upcomingReminders.map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-3">
                <Button variant="outline" size="icon" onClick={() => toggleDone(r.id, r.done)}>
                  <Check className="size-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {relativeDay(new Date(r.due_at))} · {format(new Date(r.due_at), "p")} ·{" "}
                    {formatDistanceToNow(new Date(r.due_at), { addSuffix: true })}
                  </div>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: bucketColor(r.bucket) + "22",
                    color: bucketColor(r.bucket),
                  }}
                >
                  {bucketLabel(r.bucket)}
                </span>
                <Button variant="ghost" size="icon" onClick={() => removeReminder(r.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {doneReminders.length > 0 && (
          <details className="mt-3">
            <summary className="text-xs text-muted-foreground cursor-pointer">
              {doneReminders.length} completed
            </summary>
            <ul className="mt-2 divide-y rounded-xl border bg-card/50">
              {doneReminders.map((r) => (
                <li key={r.id} className="flex items-center gap-3 p-3 text-muted-foreground">
                  <Button variant="ghost" size="icon" onClick={() => toggleDone(r.id, r.done)}>
                    <Check className="size-4" />
                  </Button>
                  <div className="flex-1 text-sm line-through truncate">{r.title}</div>
                  <Button variant="ghost" size="icon" onClick={() => removeReminder(r.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="size-4" />
          <h2 className="font-semibold">Events</h2>
        </div>
        {(events.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">
            No events yet.
          </p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {(events.data ?? []).map((e) => (
              <li key={e.id} className="rounded-xl border bg-card p-4 flex gap-3">
                <div className="text-center shrink-0 border rounded-lg px-3 py-2">
                  <div className="text-[10px] uppercase text-muted-foreground">
                    {format(new Date(e.starts_at), "MMM")}
                  </div>
                  <div className="text-lg font-semibold">
                    {format(new Date(e.starts_at), "d")}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(e.starts_at), "EEE p")}
                  </div>
                  {e.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.notes}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeEvent(e.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
