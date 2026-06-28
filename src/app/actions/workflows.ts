"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
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
