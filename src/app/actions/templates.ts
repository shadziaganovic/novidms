"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { parseTemplateFields } from "@/lib/templates";

export type TemplateState = { error?: string } | undefined;

const Schema = z.object({
  name: z.string().trim().min(2, "Naziv mora imati barem 2 znaka."),
  description: z.string().trim().optional(),
  body: z.string().trim().min(1, "Tekst predloška je obavezan."),
});

function parseForm(formData: FormData) {
  return Schema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    body: formData.get("body"),
  });
}

/** Create a document template (admin only, tenant-scoped). */
export async function createTemplate(
  _prev: TemplateState,
  formData: FormData,
): Promise<TemplateState> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") return { error: "Samo administrator firme." };
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci." };
  }
  const fields = parseTemplateFields(formData.get("fields"));
  await prisma.documentTemplate.create({
    data: {
      tenantId: ctx.tenantId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      body: parsed.data.body,
      fields: fields as unknown as Prisma.InputJsonValue,
      createdById: ctx.userId,
    },
  });
  revalidatePath("/admin/templates");
  redirect("/admin/templates");
}

/** Update a template (admin only, tenant-scoped via updateMany). */
export async function updateTemplate(
  _prev: TemplateState,
  formData: FormData,
): Promise<TemplateState> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") return { error: "Samo administrator firme." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Nedostaje predložak." };
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci." };
  }
  const fields = parseTemplateFields(formData.get("fields"));
  await prisma.documentTemplate.updateMany({
    where: { id, tenantId: ctx.tenantId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      body: parsed.data.body,
      fields: fields as unknown as Prisma.InputJsonValue,
    },
  });
  revalidatePath("/admin/templates");
  redirect("/admin/templates");
}

/** Delete a template (admin only, tenant-scoped). */
export async function deleteTemplate(formData: FormData): Promise<void> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.documentTemplate.deleteMany({
    where: { id, tenantId: ctx.tenantId },
  });
  revalidatePath("/admin/templates");
}
