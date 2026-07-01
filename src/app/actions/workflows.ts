"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { loadEntitlement, restrictedMessage } from "@/lib/entitlement";
import { parseSteps } from "@/lib/workflow";

export type WorkflowState = { error?: string } | undefined;

const NameSchema = z.object({
  name: z.string().trim().min(2, "Naziv mora imati barem 2 znaka."),
  description: z.string().trim().optional(),
});

/** Create an approval process (admin only, tenant-scoped). */
export async function createWorkflow(
  _prev: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") return { error: "Samo administrator firme." };
  const parsed = NameSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci." };
  }
  const steps = parseSteps(formData.get("steps"));
  if (steps.length === 0) return { error: "Dodaj barem jedan korak." };

  await prisma.workflowDefinition.create({
    data: {
      tenantId: ctx.tenantId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      steps: steps as unknown as Prisma.InputJsonValue,
      createdById: ctx.userId,
    },
  });
  revalidatePath("/admin/workflows");
  redirect("/admin/workflows");
}

/** Update an approval process (admin only, tenant-scoped). */
export async function updateWorkflow(
  _prev: WorkflowState,
  formData: FormData,
): Promise<WorkflowState> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") return { error: "Samo administrator firme." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Nedostaje proces." };
  const parsed = NameSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci." };
  }
  const steps = parseSteps(formData.get("steps"));
  if (steps.length === 0) return { error: "Dodaj barem jedan korak." };

  await prisma.workflowDefinition.updateMany({
    where: { id, tenantId: ctx.tenantId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      steps: steps as unknown as Prisma.InputJsonValue,
    },
  });
  revalidatePath("/admin/workflows");
  redirect("/admin/workflows");
}

/** Delete an approval process (admin only, tenant-scoped). */
export async function deleteWorkflow(formData: FormData): Promise<void> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.workflowDefinition.deleteMany({
    where: { id, tenantId: ctx.tenantId },
  });
  revalidatePath("/admin/workflows");
}

export type StartWorkflowState = { error?: string } | undefined;

/**
 * Start an approval process on a document: the user picks a process and an
 * approver per step. Creates a WorkflowInstance + one step per definition step.
 */
export async function startWorkflow(
  _prev: StartWorkflowState,
  formData: FormData,
): Promise<StartWorkflowState> {
  const ctx = await getTenantContext();
  const ent = await loadEntitlement(ctx.tenantId);
  if (!ent.active) return { error: restrictedMessage(ent.status) };

  const documentId = String(formData.get("documentId") ?? "");
  const definitionId = String(formData.get("definitionId") ?? "");
  if (!documentId || !definitionId) {
    return { error: "Odaberi dokument i proces." };
  }

  const [doc, def] = await Promise.all([
    prisma.document.findFirst({
      where: { id: documentId, tenantId: ctx.tenantId },
      select: { id: true },
    }),
    prisma.workflowDefinition.findFirst({
      where: { id: definitionId, tenantId: ctx.tenantId },
      select: { name: true, steps: true },
    }),
  ]);
  if (!doc) return { error: "Dokument nije pronađen." };
  if (!def) return { error: "Proces nije pronađen." };
  const steps = parseSteps(def.steps);
  if (steps.length === 0) return { error: "Proces nema korake." };

  const active = await prisma.workflowInstance.findFirst({
    where: { documentId, tenantId: ctx.tenantId, status: "IN_PROGRESS" },
    select: { id: true },
  });
  if (active) return { error: "Za ovaj dokument je odobravanje već u tijeku." };

  const approverIds = steps.map((_, i) =>
    String(formData.get(`approver_${i}`) ?? ""),
  );
  if (approverIds.some((a) => !a)) {
    return { error: "Odaberi odobravatelja za svaki korak." };
  }
  const validUsers = await prisma.user.findMany({
    where: { tenantId: ctx.tenantId, id: { in: approverIds } },
    select: { id: true },
  });
  const validSet = new Set(validUsers.map((u) => u.id));
  if (approverIds.some((a) => !validSet.has(a))) {
    return { error: "Neispravan odobravatelj." };
  }

  await prisma.workflowInstance.create({
    data: {
      tenantId: ctx.tenantId,
      documentId,
      definitionId,
      processName: def.name,
      status: "IN_PROGRESS",
      currentStep: 0,
      startedById: ctx.userId,
      steps: {
        create: steps.map((label, i) => ({
          idx: i,
          label,
          approverId: approverIds[i],
        })),
      },
    },
  });
  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/approvals");
  redirect(`/documents/${documentId}`);
}

export type ApprovalState = { error?: string } | undefined;

/** Approve or reject the current step. Only the assigned approver, in turn. */
async function decideStep(
  formData: FormData,
  decision: "APPROVED" | "REJECTED",
): Promise<ApprovalState> {
  const ctx = await getTenantContext();
  const stepId = String(formData.get("stepId") ?? "");
  const step = await prisma.workflowStepInstance.findUnique({
    where: { id: stepId },
    include: {
      instance: {
        select: {
          id: true,
          tenantId: true,
          status: true,
          currentStep: true,
          documentId: true,
        },
      },
    },
  });
  if (!step || step.instance.tenantId !== ctx.tenantId) {
    return { error: "Korak nije pronađen." };
  }
  const inst = step.instance;
  if (inst.status !== "IN_PROGRESS") return { error: "Proces više nije aktivan." };
  if (step.idx !== inst.currentStep) return { error: "Nije na tebi red." };
  if (step.approverId !== ctx.userId) {
    return { error: "Ovaj korak nije dodijeljen tebi." };
  }

  if (decision === "REJECTED") {
    const comment = String(formData.get("comment") ?? "").trim() || null;
    await prisma.$transaction([
      prisma.workflowStepInstance.update({
        where: { id: step.id },
        data: { decision: "REJECTED", comment, decidedAt: new Date() },
      }),
      prisma.workflowInstance.update({
        where: { id: inst.id },
        data: { status: "REJECTED" },
      }),
    ]);
  } else {
    const total = await prisma.workflowStepInstance.count({
      where: { instanceId: inst.id },
    });
    const isLast = step.idx >= total - 1;
    await prisma.$transaction([
      prisma.workflowStepInstance.update({
        where: { id: step.id },
        data: { decision: "APPROVED", decidedAt: new Date() },
      }),
      prisma.workflowInstance.update({
        where: { id: inst.id },
        data: isLast ? { status: "APPROVED" } : { currentStep: step.idx + 1 },
      }),
    ]);
  }

  revalidatePath("/approvals");
  revalidatePath(`/documents/${inst.documentId}`);
  return {};
}

export async function approveStep(
  _prev: ApprovalState,
  formData: FormData,
): Promise<ApprovalState> {
  return decideStep(formData, "APPROVED");
}

export async function rejectStep(
  _prev: ApprovalState,
  formData: FormData,
): Promise<ApprovalState> {
  return decideStep(formData, "REJECTED");
}
