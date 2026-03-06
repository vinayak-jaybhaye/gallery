export default function normalizeMediaId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const normalized = value.trim();
  if (!normalized) return undefined;

  const lowered = normalized.toLowerCase();
  if (lowered === "undefined" || lowered === "null") return undefined;

  return normalized;
}
