import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BUCKETS, bucketColor, bucketLabel } from "@/lib/buckets";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({ meta: [{ title: "Notes — Mind" }] }),
  component: NotesPage,
});

function NotesPage() {
  const [filter, setFilter] = useState<string>("all");
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notes"],
    queryFn: async () =>
      (await supabase.from("notes").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const filtered = (data ?? []).filter((n) => filter === "all" || n.bucket === filter);

  async function remove(id: string) {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["notes"] });
    qc.invalidateQueries({ queryKey: ["notes-recent"] });
    toast.success("Deleted");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Notes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Anything you capture with the mic lands here — bucketed automatically.
        </p>
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
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No notes here yet. Try the mic below.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((n) => (
            <div key={n.id} className="rounded-xl border bg-card p-4 group">
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: bucketColor(n.bucket) + "22", color: bucketColor(n.bucket) }}
                >
                  {bucketLabel(n.bucket)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => remove(n.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <p className="text-sm whitespace-pre-wrap">{n.content}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </div>
          ))}
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
        active ? "bg-foreground text-background border-foreground" : "hover:bg-accent",
      )}
      style={!active && color ? { color } : undefined}
    >
      {children}
    </button>
  );
}
