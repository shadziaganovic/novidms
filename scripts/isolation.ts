/*
 * Sets up two companies for the HTTP tenant-isolation test, prints machine-
 * readable values (cookies, doc id, search word), and leaves the data in place.
 * Cleanup with:  npx tsx scripts/isolation.ts cleanup
 */
import { scryptSync, randomBytes } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/auth";

function hashPassword(p: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(p, salt, 64).toString("hex")}`;
}

const A = "ZZ ISO Firma A";
const B = "ZZ ISO Firma B";
const WORD = "izolacijskadokaz1234";

async function cleanup() {
  const tenants = await prisma.tenant.findMany({
    where: { name: { in: [A, B] } },
    select: { id: true },
  });
  const ids = tenants.map((t) => t.id);
  if (ids.length) {
    await prisma.auditEntry.deleteMany({ where: { tenantId: { in: ids } } });
    await prisma.document.deleteMany({ where: { tenantId: { in: ids } } });
    await prisma.category.deleteMany({ where: { tenantId: { in: ids } } });
    await prisma.user.deleteMany({ where: { tenantId: { in: ids } } });
    await prisma.tenant.deleteMany({ where: { id: { in: ids } } });
  }
}

async function main() {
  if (process.argv.includes("cleanup")) {
    await cleanup();
    console.log("ISO test podaci očišćeni.");
    await prisma.$disconnect();
    return;
  }

  await cleanup();
  const a = await prisma.tenant.create({ data: { name: A } });
  const b = await prisma.tenant.create({ data: { name: B } });
  const ua = await prisma.user.create({
    data: {
      tenantId: a.id,
      email: "iso-a@zz-test.local",
      name: "ISO A",
      password: hashPassword("lozinka123"),
      role: "ADMIN",
      acceptedAt: new Date(),
    },
  });
  const ub = await prisma.user.create({
    data: {
      tenantId: b.id,
      email: "iso-b@zz-test.local",
      name: "ISO B",
      password: hashPassword("lozinka123"),
      role: "ADMIN",
      acceptedAt: new Date(),
    },
  });
  const docA = await prisma.document.create({
    data: {
      tenantId: a.id,
      title: "Tajni dokument A",
      fileKey: "iso-a/dummy",
      mimeType: "application/pdf",
      sizeBytes: 1,
      ocrStatus: "DONE",
      ocrText: `Povjerljivo: ${WORD} samo za firmu A.`,
      uploadedById: ua.id,
    },
  });

  const cookieA = await createSessionToken({
    uid: ua.id,
    tenantId: a.id,
    role: "ADMIN",
  });
  const cookieB = await createSessionToken({
    uid: ub.id,
    tenantId: b.id,
    role: "ADMIN",
  });

  console.log(`COOKIE_A=${cookieA}`);
  console.log(`COOKIE_B=${cookieB}`);
  console.log(`DOC_A=${docA.id}`);
  console.log(`WORD=${WORD}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
