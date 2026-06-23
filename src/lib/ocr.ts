import "server-only";
import mammoth from "mammoth";
import { extractText as unpdfExtractText, getDocumentProxy } from "unpdf";
import { prisma } from "./prisma";
import { storageGet } from "./storage";

// OCR / text-extraction abstraction:
//   - DOCX  → mammoth (reads the embedded text directly)
//   - PDF   → unpdf (extracts the PDF text layer; serverless-friendly, no native deps)
//   - PNG/JPG → tesseract.js (real OCR), languages from OCR_LANGS (e.g. "hrv+eng")
//
// Note: scanned PDFs without a text layer yield little/no text here. Rasterise+
// OCR for such PDFs can be added later behind this same function.

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function extractText(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (mimeType === "application/pdf") return extractPdf(buffer);
  if (mimeType === DOCX_MIME) return extractDocx(buffer);
  if (mimeType === "image/png" || mimeType === "image/jpeg") {
    return extractImage(buffer);
  }
  return "";
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await unpdfExtractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

async function extractImage(buffer: Buffer): Promise<string> {
  // Imported lazily so the (heavy) OCR engine only loads for image uploads.
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
