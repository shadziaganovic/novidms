import "server-only";
import mammoth from "mammoth";
import { extractText as unpdfExtractText, getDocumentProxy } from "unpdf";
import { prisma } from "./prisma";
import { storageGet } from "./storage";
import { aiReadDocumentText } from "./ai-extract";

// OCR / text-extraction abstraction. Local extraction runs FIRST (free + fast);
// AI vision is only a FALLBACK when local OCR can't read the document:
//   - DOCX    → mammoth (embedded text)
//   - PDF     → unpdf text layer; if empty (scanned PDF) → AI vision OCR
//   - PNG/JPG → tesseract.js (OCR_LANGS, e.g. "hrv+eng"); if it reads ~nothing → AI vision OCR
// The AI fallback no-ops when ANTHROPIC_API_KEY isn't set, so OCR degrades safely.

// Below this many characters, local OCR output is treated as effectively empty
// and we fall back to AI vision (covers scanned PDFs and images tesseract can't read).
const MIN_OCR_CHARS = 20;

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function extractText(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (mimeType === "application/pdf") return extractPdf(buffer);
  if (mimeType === DOCX_MIME) return extractDocx(buffer);
  if (mimeType === "image/png" || mimeType === "image/jpeg") {
    return extractImage(buffer, mimeType);
  }
  return "";
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await unpdfExtractText(pdf, { mergePages: true });
  const layer = (Array.isArray(text) ? text.join("\n") : text).trim();
  // Digital PDFs carry a real text layer — use it (fast, free). Scanned/image-only
  // PDFs don't, so fall back to AI vision to actually read the page content.
  if (layer.length >= MIN_OCR_CHARS) return layer;
  const aiText = await aiReadDocumentText(buffer, "application/pdf");
  return aiText || layer;
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

async function extractImage(buffer: Buffer, mimeType: string): Promise<string> {
  // Local OCR first (free, handles most images). Fall back to AI vision only when
  // tesseract reads (next to) nothing — e.g. a low-quality photo or odd layout.
  const local = (await tesseractOcr(buffer)).trim();
  if (local.length >= MIN_OCR_CHARS) return local;
  const aiText = await aiReadDocumentText(buffer, mimeType);
  return aiText || local;
}

async function tesseractOcr(buffer: Buffer): Promise<string> {
  // Imported lazily so the (heavy) OCR engine only loads when actually needed.
  const { createWorker } = await import("tesseract.js");
  const langs = process.env.OCR_LANGS ?? "eng";
  const worker = await createWorker(langs);
  try {
    const { data } = await worker.recognize(buffer);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

/**
 * Process a single document's OCR end to end. Safe to call fire-and-forget via
 * `after()`. Sets PROCESSING, extracts text, then DONE (or FAILED on error).
 * Fetches by id only (system operation triggered right after upload).
 */
export async function processDocumentOcr(documentId: string): Promise<void> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, fileKey: true, mimeType: true },
  });
  if (!doc) return;

  await prisma.document.update({
    where: { id: documentId },
    data: { ocrStatus: "PROCESSING" },
  });

  try {
    const buffer = await storageGet(doc.fileKey);
    const text = (await extractText(buffer, doc.mimeType)).trim();
    await prisma.document.update({
      where: { id: documentId },
      data: { ocrText: text.length > 0 ? text : null, ocrStatus: "DONE" },
    });
  } catch (e) {
    console.error(`OCR neuspješan za dokument ${documentId}:`, e);
    await prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: "FAILED" },
    });
  }
}
