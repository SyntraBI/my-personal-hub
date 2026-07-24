import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Bell, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatIST, dayKeyIST } from "@/lib/tz";
import { bucketColor } from "@/lib/buckets";

export type CalendarItem = {
  id: string;
  title: string;
  when: string; // ISO timestamp
  kind: "reminder" | "event";
  bucket: string;
};

type View = "day" | "week" | "month";

// ---- IST-aware date math ---------------------------------------------------
// Use a Date whose UTC fields equal the IST wall-clock so we can add/subtract
// days safely across DST-free IST.
function istWall(d: Date): Date {
  const [y, m, day] = dayKeyIST(d).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}
function addDaysUTC(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}
function startOfWeekUTC(d: Date): Date {
  // Week starts Sunday.
  return addDaysUTC(d, -d.getUTCDay());
}
function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function endOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}
function isSameDayUTC(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export function CalendarView({ items }: { items: CalendarItem[] }) {
  const [view, setView] = useState<View>("month");
  // Cursor is a UTC-encoded IST wall date.
  const [cursor, setCursor] = useState<Date>(() => istWall(new Date()));
  const todayWall = istWall(new Date());

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of items) {
      const key = dayKeyIST(it.when);
      const list = map.get(key) ?? [];
      list.push(it);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime());
    }
    return map;
  }, [items]);

  function shift(dir: -1 | 1) {
    if (view === "day") setCursor((c) => addDaysUTC(c, dir));
    else if (view === "week") setCursor((c) => addDaysUTC(c, dir * 7));
    else setCursor((c) => new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + dir, 1)));
  }

  const rangeLabel =
    view === "day"
      ? formatIST(cursor, "EEEE, MMMM d, yyyy")
      : view === "week"
        ? (() => {
            const s = startOfWeekUTC(cursor);
            const e = addDaysUTC(s, 6);
            const sameMonth = s.getUTCMonth() === e.getUTCMonth();
            return sameMonth
              ? `${formatIST(s, "MMM d")} – ${formatIST(e, "d, yyyy")}`
              : `${formatIST(s, "MMM d")} – ${formatIST(e, "MMM d, yyyy")}`;
          })()
        : formatIST(cursor, "MMMM yyyy");

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border-b">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Previous">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(todayWall)}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next">
            <ChevronRight className="size-4" />
          </Button>
          <div className="text-sm font-medium ml-2 min-w-0 truncate">{rangeLabel}</div>
        </div>
      </div>

      <Tabs value={view}>
        <TabsContent value="day" className="m-0">
          <DayAgenda date={cursor} items={byDay.get(dayKeyIST(cursor)) ?? []} />
        </TabsContent>
        <TabsContent value="week" className="m-0">
          <WeekGrid cursor={cursor} byDay={byDay} today={todayWall} />
        </TabsContent>
        <TabsContent value="month" className="m-0">
          <MonthGrid cursor={cursor} byDay={byDay} today={todayWall} onPick={(d) => { setCursor(d); setView("day"); }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ItemPill({ it }: { it: CalendarItem }) {
  const c = bucketColor(it.bucket);
  const Icon = it.kind === "reminder" ? Bell : CalendarDays;
  return (
    <div
      className="flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] truncate"
      style={{ background: c + "22", color: c }}
      title={`${it.title} · ${formatIST(it.when, "p")}`}
    >
      <Icon className="size-3 shrink-0" />
      <span className="truncate">{formatIST(it.when, "h:mm a")} {it.title}</span>
    </div>
  );
}

function DayAgenda({ date, items }: { date: Date; items: CalendarItem[] }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const byHour = new Map<number, CalendarItem[]>();
  for (const it of items) {
    const h = Number(formatIST(it.when, "HH"));
    const list = byHour.get(h) ?? [];
    list.push(it);
    byHour.set(h, list);
  }
  return (
    <div className="max-h-[520px] overflow-y-auto">
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground p-6 text-center">
          Nothing scheduled for {formatIST(date, "EEE, MMM d")}.
        </p>
      )}
      <ul className="divide-y">
        {hours.map((h) => {
          const list = byHour.get(h) ?? [];
          if (list.length === 0) return null;
          return (
            <li key={h} className="flex gap-3 p-3">
              <div className="w-14 shrink-0 text-xs text-muted-foreground pt-0.5">
                {((h + 11) % 12) + 1}:00 {h >= 12 ? "PM" : "AM"}
              </div>
              <div className="flex-1 space-y-1">
                {list.map((it) => (
                  <ItemPill key={it.id} it={it} />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WeekGrid({
  cursor,
  byDay,
  today,
}: {
  cursor: Date;
  byDay: Map<string, CalendarItem[]>;
  today: Date;
}) {
  const start = startOfWeekUTC(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDaysUTC(start, i));
  return (
    <div className="grid grid-cols-7 divide-x">
      {days.map((d) => {
        const items = byDay.get(dayKeyIST(d)) ?? [];
        const isToday = isSameDayUTC(d, today);
        return (
          <div key={d.toISOString()} className="min-h-[280px] p-2 flex flex-col gap-1.5">
            <div
              className={cn(
                "text-xs font-medium flex items-baseline gap-1",
                isToday && "text-primary",
              )}
            >
              <span className="text-muted-foreground">{formatIST(d, "EEE")}</span>
              <span
                className={cn(
                  "rounded-full size-6 inline-flex items-center justify-center",
                  isToday && "bg-primary text-primary-foreground",
                )}
              >
                {formatIST(d, "d")}
              </span>
            </div>
            <div className="flex-1 space-y-1 overflow-hidden">
              {items.map((it) => (
                <ItemPill key={it.id} it={it} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid({
  cursor,
  byDay,
  today,
  onPick,
}: {
  cursor: Date;
  byDay: Map<string, CalendarItem[]>;
  today: Date;
  onPick: (d: Date) => void;
}) {
  const first = startOfMonthUTC(cursor);
  const last = endOfMonthUTC(cursor);
  const gridStart = startOfWeekUTC(first);
  const totalDays = Math.ceil((last.getTime() - gridStart.getTime()) / 86400000) + 1;
  const cells = totalDays + ((7 - (totalDays % 7)) % 7);
  const days = Array.from({ length: cells }, (_, i) => addDaysUTC(gridStart, i));
  const month = cursor.getUTCMonth();
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div>
      <div className="grid grid-cols-7 border-b">
        {weekdays.map((w) => (
          <div key={w} className="text-[11px] text-muted-foreground text-center py-1.5">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, idx) => {
          const items = byDay.get(dayKeyIST(d)) ?? [];
          const inMonth = d.getUTCMonth() === month;
          const isToday = isSameDayUTC(d, today);
          return (
            <button
              type="button"
              onClick={() => onPick(d)}
              key={idx}
              className={cn(
                "min-h-[92px] text-left border-r border-b p-1.5 flex flex-col gap-1 hover:bg-accent/50 transition-colors",
                !inMonth && "bg-muted/30 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "text-xs self-start rounded-full size-6 inline-flex items-center justify-center",
                  isToday && "bg-primary text-primary-foreground font-medium",
                )}
              >
                {formatIST(d, "d")}
              </span>
              <div className="flex-1 space-y-0.5 w-full overflow-hidden">
                {items.slice(0, 3).map((it) => (
                  <ItemPill key={it.id} it={it} />
                ))}
                {items.length > 3 && (
                  <div className="text-[10px] text-muted-foreground">
                    +{items.length - 3} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
