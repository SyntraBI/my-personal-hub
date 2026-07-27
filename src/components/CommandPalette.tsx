import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  StickyNote,
  CalendarDays,
  KeyRound,
  Bell,
  Search,
  LogOut,
} from "lucide-react";
import { formatIST } from "@/lib/tz";
import { bucketLabel } from "@/lib/buckets";

type SearchResults = {
  notes: any[];
  reminders: any[];
  events: any[];
  credentials: any[];
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    notes: [],
    reminders: [],
    events: [],
    credentials: [],
  });
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    let cancelled = false;
    (async () => {
      const like = q ? `%${q}%` : null;
      const [notesQ, remQ, evtQ, credQ] = await Promise.all([
        like
          ? supabase.from("notes").select("*").ilike("content", like).limit(6)
          : supabase.from("notes").select("*").order("created_at", { ascending: false }).limit(6),
        like
          ? supabase.from("reminders").select("*").ilike("title", like).limit(6)
          : supabase.from("reminders").select("*").eq("done", false).order("due_at").limit(6),
        like
          ? supabase.from("events").select("*").ilike("title", like).limit(6)
          : supabase.from("events").select("*").order("starts_at", { ascending: true }).limit(6),
        like
          ? supabase.from("credentials").select("*").ilike("label", like).limit(6)
          : supabase.from("credentials").select("*").order("label").limit(4),
      ]);
      if (cancelled) return;
      setResults({
        notes: notesQ.data ?? [],
        reminders: remQ.data ?? [],
        events: evtQ.data ?? [],
        credentials: credQ.data ?? [],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, query]);

  function go(path: "/dashboard" | "/notes" | "/calendar" | "/vault") {
    setOpen(false);
    navigate({ to: path });
  }

  async function signOut() {
    setOpen(false);
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search notes, reminders, events, vault…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard className="size-4" /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/notes")}>
            <StickyNote className="size-4" /> Notes
          </CommandItem>
          <CommandItem onSelect={() => go("/calendar")}>
            <CalendarDays className="size-4" /> Calendar
          </CommandItem>
          <CommandItem onSelect={() => go("/vault")}>
            <KeyRound className="size-4" /> Vault
          </CommandItem>
        </CommandGroup>

        {results.notes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Notes">
              {results.notes.map((n) => (
                <CommandItem key={n.id} onSelect={() => go("/notes")}>
                  <StickyNote className="size-4" />
                  <span className="truncate">{n.content}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {bucketLabel(n.bucket)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.reminders.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Reminders">
              {results.reminders.map((r) => (
                <CommandItem key={r.id} onSelect={() => go("/calendar")}>
                  <Bell className="size-4" />
                  <span className="truncate">{r.title}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {formatIST(r.due_at, "MMM d, p")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.events.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Events">
              {results.events.map((e) => (
                <CommandItem key={e.id} onSelect={() => go("/calendar")}>
                  <CalendarDays className="size-4" />
                  <span className="truncate">{e.title}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {formatIST(e.starts_at, "MMM d, p")}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.credentials.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Vault">
              {results.credentials.map((c) => (
                <CommandItem key={c.id} onSelect={() => go("/vault")}>
                  <KeyRound className="size-4" />
                  <span className="truncate">{c.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setOpen(false);
              qc.invalidateQueries();
            }}
          >
            <Search className="size-4" /> Refresh data
          </CommandItem>
          <CommandItem onSelect={signOut}>
            <LogOut className="size-4" /> Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
