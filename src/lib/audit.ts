import "server-only";
import { prisma } from "./prisma";

export type AuditAction = "UPLOAD" | "VIEW" | "DOWNLOAD" | "DELETE";

/** Append a tenant-scoped audit entry. Best-effort; never throws to the caller. */
export async function logAudit(entry: {
  tenantId: string;
  documentId?: string | null;
  userId: string;
  action: AuditAction;
}): Promise<void> {
  try {
    await prisma.auditEntry.create({
      data: {
        tenantId: entry.tenantId,
        documentId: entry.documentId ?? null,
        userId: entry.userId,
        action: entry.action,
      },
    });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}
