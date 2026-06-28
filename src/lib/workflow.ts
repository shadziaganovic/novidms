// Shared workflow helpers (safe in both server and client components).

/** Parse the steps JSON into an ordered list of non-empty step labels. */
export function parseSteps(raw: unknown): string[] {
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];

  const out: string[] = [];
  for (const item of arr) {
    const label =
      typeof item === "string"
        ? item.trim()
        : item && typeof item === "object"
          ? String((item as Record<string, unknown>).label ?? "").trim()
          : "";
    if (label) out.push(label);
  }
  return out;
}
