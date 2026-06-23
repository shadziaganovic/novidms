// Shared document constants/helpers. No server-only here — imported by client
// components (upload form) as well as server pages.

export const ALLOWED_MIME: Record<string, { ext: string; label: string }> = {
  "application/pdf": { ext: "pdf", label: "PDF" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: "docx",
    label: "DOCX",
  },
  "image/png": { ext: "png", label: "PNG" },
  "image/jpeg": { ext: "jpg", label: "JPG" },
};

export const ACCEPT_ATTR =
  ".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg";

export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const OCR_STATUS_LABEL: Record<string, string> = {
  PENDING: "Na čekanju",
  PROCESSING: "U obradi",
  DONE: "Obrađeno",
  FAILED: "Neuspješno",
};
