import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { routeAndSave } from "@/lib/ai.functions";
import { useQueryClient } from "@tanstack/react-query";
import { BUCKETS } from "@/lib/buckets";
import { cn } from "@/lib/utils";

type ForcedType = "auto" | "note" | "reminder" | "event";

export function VoiceBar() {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [forcedType, setForcedType] = useState<ForcedType>("auto");
  const [forcedBucket, setForcedBucket] = useState<string>("auto");
  const recognitionRef = useRef<any>(null);
  const qc = useQueryClient();
  const route = useServerFn(routeAndSave);

  useEffect(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-IN";
    rec.onresult = (e: any) => {
      let out = "";
      for (let i = e.resultIndex; i < e.results.length; i++) out += e.results[i][0].transcript;
      setText((prev) => (e.resultIndex === 0 ? out : prev + " " + out).trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
  }, []);

  function toggleMic() {
    if (!supported) {
      toast.error("Voice not supported in this browser. Try Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      setText("");
      try {
        recognitionRef.current?.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  }

  async function submit() {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const result = await route({
        data: {
          text: value,
          forcedType,
          forcedBucket: forcedBucket === "auto" ? undefined : forcedBucket,
        },
      });
      toast.success(`Saved as ${result.kind}`);
      setText("");
      qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky bottom-0 border-t border-border/60 bg-background/80 backdrop-blur-xl z-30">
      {listening && (
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-primary animate-pulse" />
      )}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-3">
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl p-1.5 transition-all",
            listening && "shadow-glow border-primary/50",
          )}
        >
          <Button
            type="button"
            variant={listening ? "default" : "ghost"}
            size="icon"
            onClick={toggleMic}
            className={cn(
              "rounded-xl shrink-0",
              listening && "bg-gradient-primary text-primary-foreground animate-pulse shadow-glow",
            )}
            aria-label="Toggle microphone"
          >
            {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>

          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Speak or type — "remind me tomorrow 9am to call mom"'
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-2"
          />

          <div className="hidden sm:flex items-center gap-1.5">
            <Select value={forcedType} onValueChange={(v) => setForcedType(v as ForcedType)}>
              <SelectTrigger className="w-[110px] border-border/60 bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <span className="flex items-center gap-1.5">
                    <Wand2 className="size-3" /> Auto
                  </span>
                </SelectItem>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>

            <Select value={forcedBucket} onValueChange={setForcedBucket}>
              <SelectTrigger className="w-[130px] border-border/60 bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto bucket</SelectItem>
                {BUCKETS.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={submit}
            disabled={busy || !text.trim()}
            size="icon"
            className="rounded-xl bg-gradient-primary text-primary-foreground border-0 shadow-glow shrink-0"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
