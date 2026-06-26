"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { extractInvoiceData } from "@/lib/ai-extract";

export type AiState =
  | { error?: string; ok?: boolean; filled?: string[] }
  | undefined;

/** Run AI extraction on a document's OCR text and prefill its invoice fields. */
export async function extractDocumentInvoice(
  id: string,
  _prev: AiState,
): Promise<AiState> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") {
    return { error: "Samo administrator firme može pokrenuti AI izvlačenje." };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "AI nije konfiguriran (nedostaje ANTHROPIC_API_KEY)." };
  }

  const doc = await prisma.document.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { id: true, ocrText: true, ocrStatus: true },
  });
  if (!doc) return { error: "Dokument nije pronađen." };
  if (doc.ocrStatus !== "DONE" || !doc.ocrText?.trim()) {
    return { error: "OCR još nije gotov ili dokument nema prepoznatog teksta." };
  }

  let data;
  try {
    data = await extractInvoiceData(doc.ocrText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("credit balance") || msg.includes("billing")) {
      return {
        error:
          "AI nije dostupan: Anthropic račun nema kredita. Dodaj kredite (Plans & Billing) pa pokušaj ponovno.",
      };
    }
    if (msg.includes("authentication") || msg.includes("401")) {
      return { error: "AI ključ nije ispravan (provjeri ANTHROPIC_API_KEY)." };
    }
    console.error("AI extraction failed:", e);
    return { error: "AI izvlačenje nije uspjelo. Pokušaj ponovno." };
  }
  if (!data) return { error: "AI nije uspio izvući podatke iz dokumenta." };

  const update: {
    partner?: string;
    invoiceNumber?: string;
    amount?: number;
    documentDate?: Date;
    dueDate?: Date;
  } = {};
  const filled: string[] = [];

  if (data.partner?.trim()) {
    update.partner = data.partner.trim();
    filled.push("partner");
  }
  if (data.invoiceNumber?.trim()) {
    update.invoiceNumber = data.invoiceNumber.trim();
    filled.push("broj računa");
  }
  if (typeof data.amount === "number" && Number.isFinite(data.amount) && data.amount >= 0) {
    update.amount = Math.round(data.amount * 100) / 100;
    filled.push("iznos");
  }
  if (data.documentDate) {
    const d = new Date(data.documentDate);
    if (!Number.isNaN(d.getTime())) {
      update.documentDate = d;
      filled.push("datum");
    }
  }
  if (data.dueDate) {
    const d = new Date(data.dueDate);
    if (!Number.isNaN(d.getTime())) {
      update.dueDate = d;
      filled.push("dospijeće");
    }
  }

  if (filled.length === 0) return { ok: true, filled: [] };

  await prisma.document.updateMany({
    where: { id, tenantId: ctx.tenantId },
    data: update,
  });
  revalidatePath(`/documents/${id}`);
  return { ok: true, filled };
}
