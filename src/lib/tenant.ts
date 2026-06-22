import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import type { Role } from "./auth";

// Tenant isolation lives here. EVERY query that reads documents, categories or
// users must filter by `tenantId` taken from this context — never a global read.

export interface TenantContext {
  userId: string;
  tenantId: string;
  role: Role;
}

/** Authenticated context. Redirects to /login when there is no valid session. */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await getSession();
  if (!session) redirect("/login");
  return {
    userId: session.uid,
    tenantId: session.tenantId,
    role: session.role,
  };
}

/** Like getTenantContext but returns null instead of redirecting. */
export async function getOptionalTenantContext(): Promise<TenantContext | null> {
  const session = await getSession();
  if (!session) return null;
  return {
    userId: session.uid,
    tenantId: session.tenantId,
    role: session.role,
  };
}

/** Admin-only page guard. Sends members back to the dashboard. */
export async function requireAdminContext(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") redirect("/dashboard");
  return ctx;
}

/** Thrown by assertAdmin so server actions / route handlers can return 403. */
export class ForbiddenError extends Error {
  constructor(message = "Samo administrator firme smije ovu radnju.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Trivial role check for use inside server actions / route handlers. */
export function assertAdmin(ctx: TenantContext): void {
  if (ctx.role !== "ADMIN") throw new ForbiddenError();
}
