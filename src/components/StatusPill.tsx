import { OCR_STATUS_LABEL } from "@/lib/documents";

const STYLES: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  PROCESSING: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`pill ${STYLES[status] ?? STYLES.PENDING}`}>
      {OCR_STATUS_LABEL[status] ?? status}
    </span>
  );
}
