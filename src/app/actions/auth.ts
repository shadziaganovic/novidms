"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/session";
import { TRIAL_DAYS } from "@/lib/entitlement";
import { getTenantContext } from "@/lib/tenant";
import {
  createResetToken,
  verifyResetToken,
  decodeResetUserId,
} from "@/lib/reset";
import { sendPasswordResetEmail } from "@/lib/email";

export type AuthState =
  | { error?: string; fieldErrors?: Record<string, string[] | undefined> }
  | undefined;

const RegisterSchema = z.object({
  company: z.string().trim().min(2, "Naziv firme mora imati barem 2 znaka."),
  name: z.string().trim().min(2, "Ime mora imati barem 2 znaka."),
  email: z.string().trim().email("Neispravan email."),
  password: z.string().min(8, "Lozinka mora imati barem 8 znakova."),
});

/** Register a new company: creates a Tenant + its first ADMIN user, logs in. */
export async function registerCompany(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = RegisterSchema.safeParse({
    company: formData.get("company"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { company, name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  let userId: string;
  let tenantId: string;
  try {
    const user = await prisma.$transaction(async (tx) => {
      const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const tenant = await tx.tenant.create({
        data: { name: company, status: "TRIAL", trialEndsAt },
      });
      return tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          name,
          password: hashPassword(password),
          role: "ADMIN",
          acceptedAt: new Date(),
        },
      });
    });
    userId = user.id;
    tenantId = user.tenantId;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Korisnik s tim emailom već postoji." };
    }
    throw e;
  }

  await createSession({ uid: userId, tenantId, role: "ADMIN" });
  redirect("/dashboard");
}

const LoginSchema = z.object({
  email: z.string().trim().email("Neispravan email."),
  password: z.string().min(1, "Unesite lozinku."),
});

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Unesite ispravan email i lozinku." };
  }
  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  // Generic message — never reveal whether the email exists.
  if (
    !user ||
    !user.acceptedAt ||
    !verifyPassword(parsed.data.password, user.password)
  ) {
    return { error: "Neispravan email ili lozinka." };
  }

  await createSession({
    uid: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });

  const fromRaw = formData.get("from");
  const from =
    typeof fromRaw === "string" &&
    fromRaw.startsWith("/") &&
    !fromRaw.startsWith("//")
      ? fromRaw
      : "/dashboard";
  redirect(from);
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Password: forgot/reset via email + change (logged-in)
// ---------------------------------------------------------------------------

export type PasswordState = { error?: string; ok?: boolean } | undefined;

const ForgotSchema = z.object({
  email: z.string().trim().email("Neispravan email."),
});

/**
 * Start a password reset: emails a reset link if the account exists & is active.
 * Always returns a generic success — never reveals whether the email exists.
 */
export async function requestPasswordReset(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const parsed = ForgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravan email." };
  }
  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.acceptedAt) {
    const token = createResetToken(user.id, user.password);
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
    await sendPasswordResetEmail({
      to: user.email,
      recipientName: user.name,
      resetLink: `${base}/reset-password/${token}`,
    });
  }
  return { ok: true };
}

const ResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Lozinka mora imati barem 8 znakova."),
});

/** Complete a password reset using the emailed token. */
export async function resetPassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const parsed = ResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci." };
  }
  const uid = decodeResetUserId(parsed.data.token);
  const user = uid ? await prisma.user.findUnique({ where: { id: uid } }) : null;
  // Token is bound to the current password hash → single-use (dies after reset).
  if (!user || !verifyResetToken(parsed.data.token, user.password)) {
    return { error: "Poveznica je neispravna ili je istekla. Zatražite novu." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashPassword(parsed.data.password),
      acceptedAt: user.acceptedAt ?? new Date(),
    },
  });
  redirect("/login?reset=1");
}

const ChangeSchema = z.object({
  currentPassword: z.string().min(1, "Unesite trenutnu lozinku."),
  newPassword: z.string().min(8, "Nova lozinka mora imati barem 8 znakova."),
});

/** Change the password of the logged-in user (requires the current password). */
export async function changePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const ctx = await getTenantContext();
  const parsed = ChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Neispravni podaci." };
  }
  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  if (!user || !verifyPassword(parsed.data.currentPassword, user.password)) {
    return { error: "Trenutna lozinka nije točna." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashPassword(parsed.data.newPassword) },
  });
  return { ok: true };
}
