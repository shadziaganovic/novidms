"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenantContext, ForbiddenError } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { storageDelete } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export type DocFormState = { error?: string; ok?: boolean } | undefined;

const UpdateSchema = z.object({
  title: z.string().trim().min(1, "Naziv je obavezan."),
  description: z.string().trim().optional(),
  partner: z.string().trim().optional(),
  invoiceNumber: z.string().trim().max(60, "Broj računa je predug.").optional(),
  documentDate: z.string().trim().optional(),
  dueDate: z.string().trim().optional(),
  amount: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  costCenterId: z.string().trim().optional(),
});

function parseDate(value: string | undefined): Date | null | "invalid" {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

/** Edit document metadata (ADMIN only). Bound with the document id. */
export async function updateDocument(
  id: string,
  _prev: DocFormState,
  formData: FormData,
): Promise<DocFormState> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") {
    return { error: "Samo administrator firme može uređivati dokumente." };
  }

  const parsed = UpdateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    partner: formData.get("partner") ?? undefined,
    invoiceNumber: formData.get("invoiceNumber") ?? undefined,
    documentDate: formData.get("documentDate") ?? undefined,
    dueDate: formData.get("dueDate") ?? undefined,
    amount: formData.get("amount") ?? undefined,
    categoryId: formData.get("categoryId") ?? undefined,
    costCenterId: formData.get("costCenterId") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci." };
  }
  const data = parsed.data;

  let resolvedCategoryId: string | null = null;
  if (data.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: data.categoryId, tenantId: ctx.tenantId },
      select: { id: true },
    });
    if (!cat) return { error: "Odabrana kategorija ne postoji." };
    resolvedCategoryId = cat.id;
  }

  let resolvedCostCenterId: string | null = null;
  if (data.costCenterId) {
    const cc = await prisma.costCenter.findFirst({
      where: { id: data.costCenterId, tenantId: ctx.tenantId },
      select: { id: true },
    });
    if (!cc) return { error: "Odabrani troškovni centar ne postoji." };
    resolvedCostCenterId = cc.id;
  }

  const documentDate = parseDate(data.documentDate);
  if (documentDate === "invalid") return { error: "Neispravan datum dokumenta." };
  const dueDate = parseDate(data.dueDate);
  if (dueDate === "invalid") return { error: "Neispravan datum dospijeća." };

  let amount: number | null = null;
  if (data.amount) {
    const n = Number(data.amount.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) return { error: "Neispravan iznos." };
    amount = Math.round(n * 100) / 100;
  }

  // updateMany with tenantId in the filter guarantees tenant isolation.
  const result = await prisma.document.updateMany({
    where: { id, tenantId: ctx.tenantId },
    data: {
      title: data.title,
      description: data.description || null,
      partner: data.partner || null,
      invoiceNumber: data.invoiceNumber || null,
      documentDate,
      dueDate,
      amount,
      categoryId: resolvedCategoryId,
      costCenterId: resolvedCostCenterId,
    },
  });
  if (result.count === 0) return { error: "Dokument nije pronađen." };

  revalidatePath(`/documents/${id}`);
  revalidatePath("/documents");
  return { ok: true };
}

/** Delete a document + its stored file (ADMIN only). Bound with the id. */
export async function deleteDocument(id: string): Promise<void> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") throw new ForbiddenError();

  const doc = await prisma.document.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { id: true, fileKey: true },
  });
  if (!doc) redirect("/documents");

  await logAudit({
    tenantId: ctx.tenantId,
    documentId: id,
    userId: ctx.userId,
    action: "DELETE",
  });
  await prisma.document.delete({ where: { id: doc.id } });
  await storageDelete(doc.fileKey);

  revalidatePath("/documents");
  redirect("/documents");
}
