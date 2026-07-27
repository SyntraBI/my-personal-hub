import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BUCKETS, bucketColor, bucketLabel } from "@/lib/buckets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pin, PinOff, Search, Copy, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [
      { title: "Notes — Mind" },
      { name: "description", content: "Every thought, bucketed and searchable." },
    ],
  }),
  component: NotesPage,
});

const PIN_KEY = "mind-pinned-notes";
function getPins(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(PIN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function savePins(s: Set<string>) {
  localStorage.setItem(PIN_KEY, JSON.stringify([...s]));
}

function NotesPage() {
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [pins, setPins] = useState<Set<string>>(() => getPins());
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notes"],
    queryFn: async () =>
      (await supabase.from("notes").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? [])
      .filter((n) => filter === "all" || n.bucket === filter)
      .filter((n) => !term || n.content.toLowerCase().includes(term))
      .sort((a, b) => {
        const pa = pins.has(a.id) ? 1 : 0;
        const pb = pins.has(b.id) ? 1 : 0;
        if (pa !== pb) return pb - pa;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [data, filter, q, pins]);

  async function remove(id: string) {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["notes"] });
    qc.invalidateQueries({ queryKey: ["notes-recent"] });
    toast.success("Deleted");
  }

  function togglePin(id: string) {
    const next = new Set(pins);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    savePins(next);
    setPins(next);
  }

  async function copyNote(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  function exportAll() {
    const blob = new Blob([JSON.stringify(data ?? [], null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mind-notes-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-4xl md:text-5xl">Notes</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Anything you capture with the mic lands here — bucketed automatically.
          </p>
        </div>
        <Button variant="outline" onClick={exportAll} className="border-border/60">
          <Download className="size-4" /> Export
        </Button>
      </div>

      <div className="relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search notes…"
          className="pl-9 bg-card/60 border-border/60"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterPill>
        {BUCKETS.map((b) => (
          <FilterPill key={b.id} active={filter === b.id} onClick={() => setFilter(b.id)} color={b.color}>
            {b.label}
          </FilterPill>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
          {q ? "No matches." : "No notes here yet. Try the mic below."}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((n) => {
            const pinned = pins.has(n.id);
            return (
              <div
                key={n.id}
                className={cn(
                  "rounded-2xl border border-border/60 bg-card/60 p-4 group relative overflow-hidden transition-all hover:-translate-y-0.5",
                  pinned && "ring-1 ring-primary/30 shadow-glow",
                )}
              >
                <span
                  className="absolute left-0 top-0 bottom-0 w-0.5"
                  style={{ background: bucketColor(n.bucket) }}
                />
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: bucketColor(n.bucket) + "22", color: bucketColor(n.bucket) }}
                  >
                    {bucketLabel(n.bucket)}
                  </span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => togglePin(n.id)} title="Pin">
                      {pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => copyNote(n.content)}>
                      <Copy className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(n.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  {pinned && (
                    <Pin className="size-3 text-primary absolute top-3 right-3 opacity-100 group-hover:opacity-0" />
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{n.content}</p>
                <p className="text-xs text-muted-foreground mt-3">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  color,
  children,
  onClick,
}: {
  active: boolean;
  color?: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1 text-xs rounded-full border transition-colors",
        active
          ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow"
          : "border-border/60 hover:bg-accent",
      )}
      style={!active && color ? { color } : undefined}
    >
      {children}
    </button>
  );
}
