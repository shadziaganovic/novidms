// Small formatting helpers, safe to use in both server and client components.
// (Byte formatting lives in lib/documents.ts.)

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Croatian month names (nominative, capitalised). Index with month-1 (1-12). */
export const MONTHS_HR = [
  "Siječanj", "Veljača", "Ožujak", "Travanj", "Svibanj", "Lipanj",
  "Srpanj", "Kolovoz", "Rujan", "Listopad", "Studeni", "Prosinac",
] as const;

/** Format a year + month (1-12) as a section label, e.g. (2026, 6) → "Lipanj 2026". */
export function formatMonthYear(year: number, month: number): string {
  const name = MONTHS_HR[month - 1];
  return name ? `${name} ${year}` : String(year);
}

/** Format an amount as EUR (hr-HR), e.g. 1234.5 → "1.234,50 €". */
export function formatMoney(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("hr-HR", { style: "currency", currency: "EUR" });
}
