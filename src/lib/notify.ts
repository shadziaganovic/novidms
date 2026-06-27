import "server-only";
import { prisma } from "./prisma";
import { sendNewDocumentEmail } from "./email";

/**
 * Best-effort: email the company's admins that a new document was uploaded.
 * No-ops when the tenant disabled the notification, there are no other admins,
 * or email isn't configured. Never throws (runs inside the upload's after()).
 */
export async function notifyNewDocumentUpload(
  documentId: string,
  tenantId: string,
  uploaderId: string,
): Promise<void> {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, notifyNewDocument: true },
    });
    if (!tenant?.notifyNewDocument) return;

    const [doc, uploader, admins] = await Promise.all([
      prisma.document.findUnique({
        where: { id: documentId },
        select: { title: true },
      }),
      prisma.user.findUnique({
        where: { id: uploaderId },
        select: { name: true },
      }),
      prisma.user.findMany({
        where: {
          tenantId,
          role: "ADMIN",
          acceptedAt: { not: null },
          id: { not: uploaderId },
        },
        select: { email: true, name: true },
      }),
    ]);
    if (!doc || admins.length === 0) return;

    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const documentLink = `${base}/documents/${documentId}`;
    await Promise.all(
      admins.map((a) =>
        sendNewDocumentEmail({
          to: a.email,
          recipientName: a.name,
          documentTitle: doc.title,
          uploaderName: uploader?.name ?? "",
          tenantName: tenant.name,
          documentLink,
        }),
      ),
    );
  } catch (e) {
    console.error("[notify] notifyNewDocumentUpload failed:", e);
  }
}
