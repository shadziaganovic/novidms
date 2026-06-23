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
  documentDate: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
});

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
    documentDate: formData.get("documentDate") ?? undefined,
    categoryId: formData.get("categoryId") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci." };
  }
  const { title, description, partner, documentDate, categoryId } = parsed.data;

  let resolvedCategoryId: string | null = null;
  if (categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: categoryId, tenantId: ctx.tenantId },
      select: { id: true },
    });
    if (!cat) return { error: "Odabrana kategorija ne postoji." };
    resolvedCategoryId = cat.id;
  }

  let date: Date | null = null;
  if (documentDate) {
    date = new Date(documentDate);
    if (Number.isNaN(date.getTime())) return { error: "Neispravan datum." };
  }

  // updateMany with tenantId in the filter guarantees tenant isolation.
  const result = await prisma.document.updateMany({
    where: { id, tenantId: ctx.tenantId },
    data: {
      title,
      description: description || null,
      partner: partner || null,
      documentDate: date,
      categoryId: resolvedCategoryId,
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
