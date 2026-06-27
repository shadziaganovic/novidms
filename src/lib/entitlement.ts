import "server-only";
import type { TenantStatus } from "@prisma/client";
import { prisma } from "./prisma";

/** Length of the free trial granted to a newly self-registered firm. */
export const TRIAL_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

type EntitlementInput = { status: TenantStatus; trialEndsAt: Date | null };

/**
 * Is a firm entitled to full (write) functionality right now?
 * ACTIVE -> yes. SUSPENDED -> no. TRIAL -> only while trialEndsAt is in the
 * future. Reads stay open regardless; this gates write actions only.
 */
export function tenantIsActive(
  t: EntitlementInput,
  now: Date = new Date(),
): boolean {
  if (t.status === "ACTIVE") return true;
  if (t.status === "SUSPENDED") return false;
  return t.trialEndsAt != null && t.trialEndsAt.getTime() > now.getTime();
}

/** Whole days left in the trial (rounded up), or null when not on a trial. */
export function trialDaysLeft(
  t: EntitlementInput,
  now: Date = new Date(),
): number | null {
  if (t.status !== "TRIAL" || t.trialEndsAt == null) return null;
  const ms = t.trialEndsAt.getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS);
}

export type Entitlement = {
  active: boolean;
  status: TenantStatus;
  trialEndsAt: Date | null;
  trialDaysLeft: number | null;
};

/** Read a firm's entitlement fresh from the DB (status can change any time). */
export async function loadEntitlement(tenantId: string): Promise<Entitlement> {
  const t = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true, trialEndsAt: true },
  });
  // A missing tenant shouldn't happen for a valid session; treat as inactive.
  if (!t) {
    return {
      active: false,
      status: "SUSPENDED",
      trialEndsAt: null,
      trialDaysLeft: null,
    };
  }
  return {
    active: tenantIsActive(t),
    status: t.status,
    trialEndsAt: t.trialEndsAt,
    trialDaysLeft: trialDaysLeft(t),
  };
}

/** Standard Croatian message shown when write access is blocked. */
export function restrictedMessage(status: TenantStatus): string {
  return status === "SUSPENDED"
    ? "Firma je suspendirana. Javite se za ponovnu aktivaciju."
    : "Probno razdoblje je isteklo. Javite se za aktivaciju računa.";
}
