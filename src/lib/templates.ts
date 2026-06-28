// Shared template types + helpers (safe in both server and client components).

export type TemplateFieldType = "text" | "textarea" | "number" | "date";

export interface TemplateField {
  key: string;
  label: string;
  type: TemplateFieldType;
  required: boolean;
}

export const FIELD_TYPE_LABELS: Record<TemplateFieldType, string> = {
  text: "Tekst",
  textarea: "Višeredni tekst",
  number: "Broj",
  date: "Datum",
};

export const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as TemplateFieldType[];

/** A placeholder key is a-z, 0-9 and underscore; referenced in the body as {{key}}. */
export function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Parse & sanitize the fields JSON coming from a template form (or the DB). */
export function parseTemplateFields(raw: unknown): TemplateField[] {
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];

  const out: TemplateField[] = [];
  const seen = new Set<string>();
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const key = normalizeKey(String(o.key ?? ""));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const type = FIELD_TYPES.includes(o.type as TemplateFieldType)
      ? (o.type as TemplateFieldType)
      : "text";
    out.push({
      key,
      label: String(o.label ?? "").trim() || key,
      type,
      required: Boolean(o.required),
    });
  }
  return out;
}
