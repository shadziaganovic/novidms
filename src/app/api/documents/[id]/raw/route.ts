import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getOptionalTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { storageGet } from "@/lib/storage";

// Serves the raw file inline (for in-browser preview via <iframe>/<img>).
// Tenant-scoped like every other read, so previews cannot cross companies.
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
    select: { fileKey: true, mimeType: true },
  });
  if (!doc) {
    return NextResponse.json({ error: "Nije pronađeno" }, { status: 404 });
  }

  const buffer = await storageGet(doc.fileKey);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(buffer.length),
      "Content-Disposition": "inline",
      // Uploads are restricted to PDF/DOCX/PNG/JPG; stop the browser sniffing
      // the content type into something executable.
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=60",
    },
  });
}
