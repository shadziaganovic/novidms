"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { storagePut, buildStorageKey } from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { loadEntitlement, restrictedMessage } from "@/lib/entitlement";
import { formatDate } from "@/lib/format";
import { fillTemplate, parseTemplateFields } from "@/lib/templates";
import { renderTemplatePdf } from "@/lib/template-pdf";

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

export type FillState = { error?: string } | undefined;

/**
 * Create a finished document from a template: fill the fields, render a PDF,
 * store it and save a Document in the DMS (searchable via ocrText). Any
 * authenticated member can create; blocked when the trial/subscription lapsed.
 */
export async function createFromTemplate(
  _prev: FillState,
  formData: FormData,
): Promise<FillState> {
  const ctx = await getTenantContext();
  const ent = await loadEntitlement(ctx.tenantId);
  if (!ent.active) return { error: restrictedMessage(ent.status) };

  const id = String(formData.get("templateId") ?? "");
  const tpl = await prisma.documentTemplate.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { name: true, body: true, fields: true },
  });
  if (!tpl) return { error: "Predložak nije pronađen." };

  const fields = parseTemplateFields(tpl.fields);
  const values: Record<string, string> = {};
  for (const f of fields) {
    let v = String(formData.get(f.key) ?? "").trim();
    if (f.required && !v) return { error: `Polje „${f.label}" je obavezno.` };
    if (f.type === "date" && v) v = formatDate(v);
    values[f.key] = v;
  }

  const filled = fillTemplate(tpl.body, values);
  const pdf = await renderTemplatePdf(filled);
  const fileKey = await storagePut(
    buildStorageKey(ctx.tenantId, `${tpl.name}.pdf`),
    pdf,
  );

  const doc = await prisma.document.create({
    data: {
      tenantId: ctx.tenantId,
      title: tpl.name,
      fileKey,
      mimeType: "application/pdf",
      sizeBytes: pdf.length,
      ocrStatus: "DONE",
      ocrText: filled,
      uploadedById: ctx.userId,
    },
    select: { id: true },
  });

  await logAudit({
    tenantId: ctx.tenantId,
    documentId: doc.id,
    userId: ctx.userId,
    action: "UPLOAD",
  });

  revalidatePath("/documents");
  redirect(`/documents/${doc.id}`);
}
