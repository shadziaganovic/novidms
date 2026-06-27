"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPlatformOwner } from "@/lib/owner";
import { TRIAL_DAYS } from "@/lib/entitlement";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Activate a firm (full functionality, no trial expiry). */
export async function activateTenant(tenantId: string): Promise<void> {
  await assertPlatformOwner();
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { status: "ACTIVE" },
  });
  revalidatePath("/owner");
}

/** Suspend a firm (read-only; blocks uploads and invites). */
export async function suspendTenant(tenantId: string): Promise<void> {
  await assertPlatformOwner();
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { status: "SUSPENDED" },
  });
  revalidatePath("/owner");
}

/** (Re)start a 30-day trial; extends from the current end date if still ahead. */
export async function extendTrial(tenantId: string): Promise<void> {
  await assertPlatformOwner();
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { trialEndsAt: true },
  });
  const base =
    t?.trialEndsAt && t.trialEndsAt.getTime() > Date.now()
      ? t.trialEndsAt.getTime()
      : Date.now();
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { status: "TRIAL", trialEndsAt: new Date(base + TRIAL_DAYS * DAY_MS) },
  });
  revalidatePath("/owner");
}
