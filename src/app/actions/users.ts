"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getTenantContext, ForbiddenError } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { hashPassword, randomPasswordHash } from "@/lib/password";
import { createSession } from "@/lib/session";
import { createInviteToken, verifyInviteToken } from "@/lib/invite";

export type UserActionState =
  | { error?: string; ok?: boolean; inviteLink?: string }
  | undefined;

const InviteSchema = z.object({
  email: z.string().trim().email("Neispravan email."),
  name: z.string().trim().min(2, "Ime je obavezno."),
  role: z.enum(["MEMBER", "ADMIN"]),
});

function inviteLinkFor(userId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return `${base}/invite/${createInviteToken(userId)}`;
}

export async function inviteUser(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") return { error: "Samo administrator firme." };

  const parsed = InviteSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role") ?? "MEMBER",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci." };
  }
  const email = parsed.data.email.toLowerCase();

  try {
    const user = await prisma.user.create({
      data: {
        tenantId: ctx.tenantId,
        email,
        name: parsed.data.name,
        role: parsed.data.role,
        password: randomPasswordHash(),
        invitedAt: new Date(),
      },
      select: { id: true },
    });
    revalidatePath("/admin/users");
    return { ok: true, inviteLink: inviteLinkFor(user.id) };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Korisnik s tim emailom već postoji." };
    }
    throw e;
  }
}

export async function changeRole(
  userId: string,
  role: "ADMIN" | "MEMBER",
): Promise<void> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") throw new ForbiddenError();
  if (userId === ctx.userId) return; // never change your own role
  await prisma.user.updateMany({
    where: { id: userId, tenantId: ctx.tenantId },
    data: { role },
  });
  revalidatePath("/admin/users");
}

export async function removeUser(userId: string): Promise<void> {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") throw new ForbiddenError();
  if (userId === ctx.userId) return; // admin cannot remove self
  await prisma.user.deleteMany({
    where: { id: userId, tenantId: ctx.tenantId },
  });
  revalidatePath("/admin/users");
}

const AcceptSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Lozinka mora imati barem 8 znakova."),
});

export async function acceptInvite(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const parsed = AcceptSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci." };
  }

  const userId = verifyInviteToken(parsed.data.token);
  if (!userId) {
    return { error: "Pozivnica je neispravna ili je istekla." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Korisnik više ne postoji." };
  if (user.acceptedAt) {
    return { error: "Pozivnica je već iskorištena. Prijavite se." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashPassword(parsed.data.password), acceptedAt: new Date() },
  });

  await createSession({
    uid: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });
  redirect("/dashboard");
}
