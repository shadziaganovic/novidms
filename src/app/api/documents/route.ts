import { NextResponse, after } from "next/server";
import type { NextRequest } from "next/server";
import { getOptionalTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { storagePut, buildStorageKey } from "@/lib/storage";
import { ALLOWED_MIME, MAX_FILE_BYTES } from "@/lib/documents";
import { logAudit } from "@/lib/audit";
import { processDocumentOcr } from "@/lib/ocr";
import { autoExtractInvoice } from "@/lib/ai-extract";

// Upload a document. Auth + tenant scoping are enforced here (defense in depth,
// in addition to proxy). OCR runs asynchronously after the response is sent.
export async function POST(req: NextRequest) {
  const ctx = await getOptionalTenantContext();
  if (!ctx) {
    return NextResponse.json({ error: "Neautorizirano" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datoteka nedostaje." }, { status: 400 });
  }
  if (!(file.type in ALLOWED_MIME)) {
    return NextResponse.json(
      { error: "Nepodržan tip datoteke (dozvoljeno: PDF, DOCX, PNG, JPG)." },
      { status: 415 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Datoteka je prazna." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "Datoteka je prevelika (najviše 20 MB)." },
      { status: 413 },
    );
  }

  const titleRaw = form.get("title");
  const title =
    typeof titleRaw === "string" && titleRaw.trim()
      ? titleRaw.trim()
      : file.name;

  // Optional cost center — validated against this tenant; invalid ids are ignored.
  const ccRaw = form.get("costCenterId");
  let costCenterId: string | null = null;
  if (typeof ccRaw === "string" && ccRaw) {
    const cc = await prisma.costCenter.findFirst({
      where: { id: ccRaw, tenantId: ctx.tenantId },
      select: { id: true },
    });
    costCenterId = cc?.id ?? null;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileKey = await storagePut(
    buildStorageKey(ctx.tenantId, file.name),
    buffer,
  );

  const doc = await prisma.document.create({
    data: {
      tenantId: ctx.tenantId,
      title,
      fileKey,
      mimeType: file.type,
      sizeBytes: file.size,
      ocrStatus: "PENDING",
      uploadedById: ctx.userId,
      costCenterId,
    },
    select: { id: true },
  });

  await logAudit({
    tenantId: ctx.tenantId,
    documentId: doc.id,
    userId: ctx.userId,
    action: "UPLOAD",
  });

  // After the response is sent: run OCR, then best-effort AI invoice extraction
  // (auto-fills empty metadata; no-ops if ANTHROPIC_API_KEY isn't set).
  after(async () => {
    await processDocumentOcr(doc.id);
    await autoExtractInvoice(doc.id, ctx.tenantId);
  });

  return NextResponse.json({ id: doc.id }, { status: 201 });
}
