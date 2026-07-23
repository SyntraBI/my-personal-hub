import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const RouteInput = z.object({
  text: z.string().min(1).max(4000),
  forcedType: z.enum(["note", "reminder", "event", "auto"]).default("auto"),
  forcedBucket: z.string().optional(),
});

const ItemSchema = z.object({
  type: z.enum(["note", "reminder", "event"]),
  bucket: z.enum(["personal", "health", "professional", "ideas", "finance", "other"]),
  title: z.string().optional(),
  content: z.string(),
  due_at: z.string().nullable().optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
});

export const routeAndSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => RouteInput.parse(v))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Lovable AI is not configured");

    const now = new Date().toISOString();
    const system = `You are a personal assistant classifier. Given the user's spoken/typed input, classify it as a note, reminder, or event and pick a bucket. Today is ${now}. Resolve relative dates (e.g. "tomorrow", "next Monday at 9", "on 25th") to full ISO 8601 timestamps in UTC. Reminders MUST include due_at. Events MUST include starts_at. Notes just need content. Keep title short (<60 chars). Buckets: personal, health, professional, ideas, finance, other.${
      data.forcedType !== "auto" ? ` FORCE type = ${data.forcedType}.` : ""
    }${data.forcedBucket ? ` FORCE bucket = ${data.forcedBucket}.` : ""}`;

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.text },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "classified_item",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                type: { type: "string", enum: ["note", "reminder", "event"] },
                bucket: {
                  type: "string",
                  enum: ["personal", "health", "professional", "ideas", "finance", "other"],
                },
                title: { type: "string" },
                content: { type: "string" },
                due_at: { type: ["string", "null"] },
                starts_at: { type: ["string", "null"] },
                ends_at: { type: ["string", "null"] },
              },
              required: ["type", "bucket", "title", "content", "due_at", "starts_at", "ends_at"],
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`AI gateway ${res.status}: ${body}`);
    }
    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content;
    if (!raw) throw new Error("No AI response");
    const parsed = ItemSchema.parse(JSON.parse(raw));

    const { supabase, userId } = context;

    if (parsed.type === "note") {
      const { data: row, error } = await supabase
        .from("notes")
        .insert({ user_id: userId, bucket: parsed.bucket, content: parsed.content })
        .select()
        .single();
      if (error) throw error;
      return { kind: "note" as const, row };
    }
    if (parsed.type === "reminder") {
      const due = parsed.due_at ?? new Date(Date.now() + 3600_000).toISOString();
      const { data: row, error } = await supabase
        .from("reminders")
        .insert({
          user_id: userId,
          bucket: parsed.bucket,
          title: parsed.title ?? parsed.content.slice(0, 60),
          due_at: due,
        })
        .select()
        .single();
      if (error) throw error;
      return { kind: "reminder" as const, row };
    }
    const starts = parsed.starts_at ?? new Date(Date.now() + 3600_000).toISOString();
    const { data: row, error } = await supabase
      .from("events")
      .insert({
        user_id: userId,
        bucket: parsed.bucket,
        title: parsed.title ?? parsed.content.slice(0, 60),
        starts_at: starts,
        ends_at: parsed.ends_at ?? null,
        notes: parsed.content,
      })
      .select()
      .single();
    if (error) throw error;
    return { kind: "event" as const, row };
  });
