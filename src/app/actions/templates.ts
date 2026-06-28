"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import {
  storagePut,
  storageGet,
  storageDelete,
  buildStorageKey,
} from "@/lib/storage";
import { logAudit } from "@/lib/audit";
import { loadEntitlement, restrictedMessage } from "@/lib/entitlement";
import { formatDate } from "@/lib/format";
import { fillTemplate, parseTemplateFields } from "@/lib/templates";
import { renderTemplatePdf } from "@/lib/template-pdf";
import { fillDocx } from "@/lib/docx";
import { processDocumentOcr } from "@/lib/ocr";

export type TemplateState = { error?: string } | undefined;

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const NameSchema = z.object({
  name: z.string().trim().min(2, "Naziv mora imati barem 2 znaka."),
  description: z.string().trim().optional(),
});

/** Store an uploaded .docx if present. Returns {} when no new file was sent. */
async function readDocxUpload(
  formData: FormData,
  tenantId: string,
): Promise<{ fileKey?: string; error?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return {};
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return { error: "Dozvoljen je samo .docx (Word) dokument." };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const fileKey = await storagePut(buildStorageKey(tenantId, file.name), buf);
  return { fileKey };
}

/** Create a document template (admin only, tenant-scoped). TEXT or DOCX. */
export async function createTemplate(
  _prev: TemplateState,
  formData: FormData,
): Promise<TemplateState> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") return { error: "Samo administrator firme." };
  const parsed = NameSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci." };
  }
  const fields = parseTemplateFields(formData.get("fields"));
  const kind = formData.get("kind") === "DOCX" ? "DOCX" : "TEXT";

  let body = "";
  let fileKey: string | null = null;
  if (kind === "TEXT") {
    body = String(formData.get("body") ?? "").trim();
    if (!body) return { error: "Tekst predloška je obavezan." };
  } else {
    const docx = await readDocxUpload(formData, ctx.tenantId);
    if (docx.error) return { error: docx.error };
    if (!docx.fileKey) return { error: "Učitaj .docx datoteku." };
    fileKey = docx.fileKey;
  }

  await prisma.documentTemplate.create({
    data: {
      tenantId: ctx.tenantId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      body,
      kind,
      fileKey,
      fields: fields as unknown as Prisma.InputJsonValue,
      createdById: ctx.userId,
    },
  });
  revalidatePath("/admin/templates");
  redirect("/admin/templates");
}

/** Update a template (admin only, tenant-scoped). */
export async function updateTemplate(
  _prev: TemplateState,
  formData: FormData,
): Promise<TemplateState> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") return { error: "Samo administrator firme." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Nedostaje predložak." };
  const existing = await prisma.documentTemplate.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { fileKey: true },
  });
  if (!existing) return { error: "Predložak nije pronađen." };

  const parsed = NameSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci." };
  }
  const fields = parseTemplateFields(formData.get("fields"));
  const kind = formData.get("kind") === "DOCX" ? "DOCX" : "TEXT";

  let body = "";
  let fileKey: string | null = existing.fileKey;
  if (kind === "TEXT") {
    body = String(formData.get("body") ?? "").trim();
    if (!body) return { error: "Tekst predloška je obavezan." };
    fileKey = null;
  } else {
    const docx = await readDocxUpload(formData, ctx.tenantId);
    if (docx.error) return { error: docx.error };
    if (docx.fileKey) {
      if (existing.fileKey) await storageDelete(existing.fileKey).catch(() => {});
      fileKey = docx.fileKey;
    } else if (!existing.fileKey) {
      return { error: "Učitaj .docx datoteku." };
    }
  }

  await prisma.documentTemplate.updateMany({
    where: { id, tenantId: ctx.tenantId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      body,
      kind,
      fileKey,
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
  const tpl = await prisma.documentTemplate.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { fileKey: true },
  });
  await prisma.documentTemplate.deleteMany({
    where: { id, tenantId: ctx.tenantId },
  });
  if (tpl?.fileKey) await storageDelete(tpl.fileKey).catch(() => {});
  revalidatePath("/admin/templates");
}

export type FillState = { error?: string } | undefined;

/**
 * Create a finished document from a template: fill the fields, render the output
 * (TEXT → PDF, DOCX → filled Word) and save it as a Document in the DMS. Any
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
    select: { name: true, body: true, fields: true, kind: true, fileKey: true },
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

  let docId: string;
  if (tpl.kind === "DOCX") {
    if (!tpl.fileKey) return { error: "Predložak nema učitanu datoteku." };
    const templateBuf = await storageGet(tpl.fileKey);
    const filled = fillDocx(templateBuf, values);
    const fileKey = await storagePut(
      buildStorageKey(ctx.tenantId, `${tpl.name}.docx`),
      filled,
    );
    const doc = await prisma.document.create({
      data: {
        tenantId: ctx.tenantId,
        title: tpl.name,
        fileKey,
        mimeType: DOCX_MIME,
        sizeBytes: filled.length,
        ocrStatus: "PENDING",
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
    // Extract text (mammoth) so the generated Word doc is searchable; best-effort.
    try {
      await processDocumentOcr(doc.id);
    } catch {
      /* indexing is best-effort */
    }
    docId = doc.id;
  } else {
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
    docId = doc.id;
  }

  revalidatePath("/documents");
  redirect(`/documents/${docId}`);
}
