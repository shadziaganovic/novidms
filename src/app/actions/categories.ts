"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenantContext, ForbiddenError } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export type CatFormState = { error?: string; ok?: boolean } | undefined;

const NameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Naziv je obavezan.")
    .max(80, "Naziv je predug."),
});

export async function createCategory(
  _prev: CatFormState,
  formData: FormData,
): Promise<CatFormState> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") return { error: "Samo administrator firme." };

  const parsed = NameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravan naziv." };
  }

  await prisma.category.create({
    data: { tenantId: ctx.tenantId, name: parsed.data.name },
  });
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function renameCategory(
  id: string,
  _prev: CatFormState,
  formData: FormData,
): Promise<CatFormState> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") return { error: "Samo administrator firme." };

  const parsed = NameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravan naziv." };
  }

  const result = await prisma.category.updateMany({
    where: { id, tenantId: ctx.tenantId },
    data: { name: parsed.data.name },
  });
  if (result.count === 0) return { error: "Kategorija nije pronađena." };

  revalidatePath("/admin/categories");
  revalidatePath("/documents");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<void> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") throw new ForbiddenError();

  // Documents keep existing but become uncategorised. Both writes are tenant
  // scoped so this cannot touch another company's data.
  await prisma.$transaction([
    prisma.document.updateMany({
      where: { categoryId: id, tenantId: ctx.tenantId },
      data: { categoryId: null },
    }),
    prisma.category.deleteMany({ where: { id, tenantId: ctx.tenantId } }),
  ]);

  revalidatePath("/admin/categories");
  revalidatePath("/documents");
}
