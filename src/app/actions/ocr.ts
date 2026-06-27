"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { processDocumentOcr } from "@/lib/ocr";
import { autoExtractInvoice } from "@/lib/ai-extract";

export type ReprocessState =
  | { error?: string; ok?: boolean; message?: string }
  | undefined;

/**
 * Re-run OCR on an already-uploaded document (e.g. a scan whose first OCR pass
 * found nothing), then auto-fill any still-empty invoice metadata. Lets the user
 * recover a document without re-uploading — useful when the file arrived by email
 * or was scanned elsewhere and there's no physical copy to scan again.
 */
export async function reprocessDocumentOcr(
  id: string,
  _prev: ReprocessState,
): Promise<ReprocessState> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") {
    return { error: "Samo administrator firme može ponoviti OCR." };
  }

  // processDocumentOcr fetches by id only, so confirm tenant ownership here.
  const owned = await prisma.document.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!owned) return { error: "Dokument nije pronađen." };

  try {
    await processDocumentOcr(id);
    await autoExtractInvoice(id, ctx.tenantId);
  } catch (e) {
    console.error("Reprocess OCR failed:", e);
    return { error: "Ponovni OCR nije uspio. Pokušaj ponovno." };
  }

  const fresh = await prisma.document.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { ocrStatus: true, ocrText: true },
  });
  revalidatePath(`/documents/${id}`);

  if (fresh?.ocrStatus === "DONE" && fresh.ocrText?.trim()) {
    return { ok: true, message: "OCR ponovljen — tekst je prepoznat." };
  }
  if (fresh?.ocrStatus === "DONE") {
    return {
      ok: true,
      message: "OCR ponovljen, ali u dokumentu nije pronađen tekst.",
    };
  }
  return { error: "OCR obrada nije uspjela." };
}
