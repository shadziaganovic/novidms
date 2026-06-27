"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export type ProfileState = { error?: string; ok?: boolean } | undefined;

const ProfileSchema = z.object({
  name: z.string().trim().min(2, "Ime mora imati barem 2 znaka."),
});

/** Update the logged-in user's own profile (name). Email is not editable. */
export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const ctx = await getTenantContext();
  const parsed = ProfileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci." };
  }
  await prisma.user.update({
    where: { id: ctx.userId },
    data: { name: parsed.data.name },
  });
  // Revalidating the path also refreshes ancestor layouts (the header name).
  revalidatePath("/account");
  return { ok: true };
}

const CompanySchema = z.object({
  name: z.string().trim().min(2, "Naziv firme mora imati barem 2 znaka."),
});

/** Update the company (tenant) settings. Admin only, tenant-scoped. */
export async function updateCompany(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") return { error: "Samo administrator firme." };
  const parsed = CompanySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci." };
  }
  await prisma.tenant.update({
    where: { id: ctx.tenantId },
    data: { name: parsed.data.name },
  });
  revalidatePath("/account");
  return { ok: true };
}
