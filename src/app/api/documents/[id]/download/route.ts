import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getOptionalTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { storageGet } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { ALLOWED_MIME } from "@/lib/documents";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await getOptionalTenantContext();
  if (!ctx) {
    return NextResponse.json({ error: "Neautorizirano" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.document.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { fileKey: true, mimeType: true, title: true },
  });
  if (!doc) {
    return NextResponse.json({ error: "Nije pronađeno" }, { status: 404 });
  }

  const buffer = await storageGet(doc.fileKey);

  await logAudit({
    tenantId: ctx.tenantId,
    documentId: id,
    userId: ctx.userId,
    action: "DOWNLOAD",
  });

  const ext = ALLOWED_MIME[doc.mimeType]?.ext;
  let name = doc.title.replace(/[\r\n"]/g, "").trim() || "dokument";
  if (ext && !name.toLowerCase().endsWith(`.${ext}`)) name += `.${ext}`;
  const asciiName = name.replace(/[^\x20-\x7E]/g, "_");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  });
}
