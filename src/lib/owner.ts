import "server-only";
import { redirect } from "next/navigation";
import { getTenantContext, ForbiddenError, type TenantContext } from "./tenant";
import { prisma } from "./prisma";

// The platform owner is an ordinary logged-in user whose User.platformAdmin flag
// is true. It is the ONLY role allowed to read across firms (the /owner
// back-office). Everything else stays strictly tenant-scoped.

async function ownerFlag(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { platformAdmin: true },
  });
  return u?.platformAdmin ?? false;
}

/** Page guard: non-owners are bounced to their own dashboard. */
export async function requirePlatformOwner(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!(await ownerFlag(ctx.userId))) redirect("/dashboard");
  return ctx;
}

/** Action guard: throws ForbiddenError for non-owners. */
export async function assertPlatformOwner(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!(await ownerFlag(ctx.userId))) {
    throw new ForbiddenError("Samo vlasnik platforme smije ovu radnju.");
  }
  return ctx;
}
