"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession } from "@/lib/session";
import { TRIAL_DAYS } from "@/lib/entitlement";

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
