/*
 * Dev seed: one demo company + admin so you can log in locally.
 *   Email:    dev@novidms.local
 *   Lozinka:  demo1234
 * Idempotent (upsert by email). Inlines scrypt hashing because password.ts is
 * marked server-only and cannot be imported from a plain script.
 */
import { scryptSync, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hashPassword(p: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(p, salt, 64).toString("hex")}`;
}

async function main() {
  const email = "dev@novidms.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Demo korisnik već postoji (${email}).`);
    return;
  }

  const tenant = await prisma.tenant.create({ data: { name: "Demo d.o.o." } });
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      name: "Demo Admin",
      password: hashPassword("demo1234"),
      role: "ADMIN",
      acceptedAt: new Date(),
    },
  });
  console.log(`Kreiran demo: ${email} / demo1234 (firma: ${tenant.name})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
