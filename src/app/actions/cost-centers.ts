"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenantContext, ForbiddenError } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export type CcFormState = { error?: string; ok?: boolean } | undefined;

const Schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Naziv je obavezan.")
    .max(120, "Naziv je predug."),
  code: z.string().trim().max(40, "Šifra je preduga.").optional(),
});

export async function createCostCenter(
  _prev: CcFormState,
  formData: FormData,
): Promise<CcFormState> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") return { error: "Samo administrator firme." };

  const parsed = Schema.safeParse({
    name: formData.get("name"),
    code: formData.get("code") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci." };
  }

  await prisma.costCenter.create({
    data: {
      tenantId: ctx.tenantId,
      name: parsed.data.name,
      code: parsed.data.code || null,
    },
  });
  revalidatePath("/admin/cost-centers");
  return { ok: true };
}

export async function renameCostCenter(
  id: string,
  _prev: CcFormState,
  formData: FormData,
): Promise<CcFormState> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") return { error: "Samo administrator firme." };

  const parsed = Schema.safeParse({
    name: formData.get("name"),
    code: formData.get("code") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci." };
  }

  const result = await prisma.costCenter.updateMany({
    where: { id, tenantId: ctx.tenantId },
    data: { name: parsed.data.name, code: parsed.data.code || null },
  });
  if (result.count === 0) return { error: "Troškovni centar nije pronađen." };

  revalidatePath("/admin/cost-centers");
  revalidatePath("/documents");
  return { ok: true };
}

export async function deleteCostCenter(id: string): Promise<void> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") throw new ForbiddenError();

  // The FK is ON DELETE SET NULL, so documents are automatically detached.
  // deleteMany with tenantId keeps it scoped to this company.
  await prisma.costCenter.deleteMany({ where: { id, tenantId: ctx.tenantId } });

  revalidatePath("/admin/cost-centers");
  revalidatePath("/documents");
}
