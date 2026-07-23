export const BUCKETS = [
  { id: "personal", label: "Personal", color: "oklch(0.75 0.15 250)" },
  { id: "health", label: "Health", color: "oklch(0.75 0.15 145)" },
  { id: "professional", label: "Professional", color: "oklch(0.75 0.15 60)" },
  { id: "ideas", label: "Ideas", color: "oklch(0.75 0.15 300)" },
  { id: "finance", label: "Finance", color: "oklch(0.75 0.15 200)" },
  { id: "other", label: "Other", color: "oklch(0.7 0 0)" },
] as const;

export type BucketId = (typeof BUCKETS)[number]["id"];

export function bucketLabel(id: string) {
  return BUCKETS.find((b) => b.id === id)?.label ?? id;
}
export function bucketColor(id: string) {
  return BUCKETS.find((b) => b.id === id)?.color ?? "oklch(0.7 0 0)";
}
