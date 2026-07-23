import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Eye, EyeOff, Copy, Plus, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/vault")({
  head: () => ({ meta: [{ title: "Vault — Mind" }] }),
  component: VaultPage,
});

function VaultPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    label: "",
    username: "",
    password: "",
    url: "",
    notes: "",
  });
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const { data } = useQuery({
    queryKey: ["credentials"],
    queryFn: async () =>
      (await supabase.from("credentials").select("*").order("label", { ascending: true })).data ?? [],
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label.trim()) return;
    const { error } = await supabase.from("credentials").insert({
      label: form.label.trim(),
      username: form.username || null,
      password: form.password || null,
      url: form.url || null,
      notes: form.notes || null,
      user_id: (await supabase.auth.getUser()).data.user!.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Saved to vault");
    setForm({ label: "", username: "", password: "", url: "", notes: "" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["credentials"] });
    qc.invalidateQueries({ queryKey: ["cred-count"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("credentials").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["credentials"] });
    qc.invalidateQueries({ queryKey: ["cred-count"] });
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Vault</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Private credentials, encrypted at rest by your backend. Only you can read them.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New credential</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>Label</Label>
                <Input
                  required
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Gmail, GitHub…"
                />
              </div>
              <div>
                <Label>Username / Email</Label>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div>
                <Label>URL</Label>
                <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(data ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <KeyRound className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No credentials yet.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(data ?? []).map((c) => (
            <div key={c.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.label}</div>
                  {c.url && (
                    <a
                      href={c.url.startsWith("http") ? c.url : `https://${c.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-muted-foreground truncate block hover:underline"
                    >
                      {c.url}
                    </a>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {c.username && (
                  <Row label="User" value={c.username} onCopy={() => copy(c.username!)} />
                )}
                {c.password && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-14">Pass</span>
                    <span className="flex-1 font-mono text-xs truncate">
                      {revealed[c.id] ? c.password : "••••••••••"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRevealed({ ...revealed, [c.id]: !revealed[c.id] })}
                    >
                      {revealed[c.id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => copy(c.password!)}>
                      <Copy className="size-4" />
                    </Button>
                  </div>
                )}
                {c.notes && <p className="text-xs text-muted-foreground pt-1">{c.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-14">{label}</span>
      <span className="flex-1 truncate">{value}</span>
      <Button variant="ghost" size="icon" onClick={onCopy}>
        <Copy className="size-4" />
      </Button>
    </div>
  );
}
