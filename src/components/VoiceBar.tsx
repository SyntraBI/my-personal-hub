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
    rec.lang = "en-US";
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
    <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={listening ? "default" : "outline"}
            size="icon"
            onClick={toggleMic}
            className={cn(listening && "animate-pulse")}
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
            className="flex-1"
          />

          <div className="hidden sm:flex items-center gap-2">
            <Select value={forcedType} onValueChange={(v) => setForcedType(v as ForcedType)}>
              <SelectTrigger className="w-[120px]">
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
              <SelectTrigger className="w-[140px]">
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

          <Button onClick={submit} disabled={busy || !text.trim()} size="icon">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
