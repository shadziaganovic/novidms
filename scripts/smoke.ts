/*
 * Smoke test for the core invariants of Faza 1:
 *  - tenant isolation on document reads
 *  - full-text search finds documents by OCR content (word NOT in the title),
 *    and does not leak across tenants
 *  - signed session token roundtrip + tamper rejection
 *
 * Idempotent. Run:   npx tsx scripts/smoke.ts
 * Cleanup only:       npx tsx scripts/smoke.ts cleanup
 *
 * Uses relative imports (not the @/ alias) so it runs under plain tsx.
 */
import { scryptSync, randomBytes } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { createSessionToken, verifySessionToken } from "../src/lib/auth";

function hashPassword(p: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(p, salt, 64).toString("hex")}`;
}

const A_NAME = "ZZ Test Firma A";
const B_NAME = "ZZ Test Firma B";

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures++;
}

async function cleanup() {
  const tenants = await prisma.tenant.findMany({
    where: { name: { in: [A_NAME, B_NAME] } },
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
    console.log("Test podaci očišćeni.");
    await prisma.$disconnect();
    return;
  }

  await cleanup();

  const a = await prisma.tenant.create({ data: { name: A_NAME } });
  const b = await prisma.tenant.create({ data: { name: B_NAME } });

  const userA = await prisma.user.create({
    data: {
      tenantId: a.id,
      email: "admin-a@zz-test.local",
      name: "Admin A",
      password: hashPassword("lozinka123"),
      role: "ADMIN",
      acceptedAt: new Date(),
    },
  });
  const userB = await prisma.user.create({
    data: {
      tenantId: b.id,
      email: "admin-b@zz-test.local",
      name: "Admin B",
      password: hashPassword("lozinka123"),
      role: "ADMIN",
      acceptedAt: new Date(),
    },
  });

  // The distinctive word "tahionski" lives ONLY in A's OCR text, never in titles.
  const docA = await prisma.document.create({
    data: {
      tenantId: a.id,
      title: "Kvartalni izvjestaj",
      fileKey: "dummy-a",
      mimeType: "application/pdf",
      sizeBytes: 1,
      ocrStatus: "DONE",
      ocrText: "Ovo je tajni tahionski izvjestaj o kvartalnom prometu.",
      uploadedById: userA.id,
      partner: "Partner Alfa",
    },
  });
  const docB = await prisma.document.create({
    data: {
      tenantId: b.id,
      title: "Ugovor o najmu",
      fileKey: "dummy-b",
      mimeType: "application/pdf",
      sizeBytes: 1,
      ocrStatus: "DONE",
      ocrText: "Sasvim drugaciji sadrzaj o najmu poslovnog prostora.",
      uploadedById: userB.id,
      partner: "Partner Beta",
    },
  });

  // 1. Session token
  const token = await createSessionToken({
    uid: userA.id,
    tenantId: a.id,
    role: "ADMIN",
  });
  const decoded = await verifySessionToken(token);
  check(
    "session token vraća točan uid/tenant/role",
    !!decoded &&
      decoded.uid === userA.id &&
      decoded.tenantId === a.id &&
      decoded.role === "ADMIN",
  );
  check(
    "krivotvoreni token je odbijen",
    (await verifySessionToken(token.slice(0, -3) + "xyz")) === null,
  );

  // 2. Tenant isolation
  const aDocs = await prisma.document.findMany({ where: { tenantId: a.id } });
  check(
    "firma A vidi samo svoj dokument",
    aDocs.length === 1 && aDocs[0].id === docA.id,
  );
  const bDocs = await prisma.document.findMany({ where: { tenantId: b.id } });
  check(
    "firma B vidi samo svoj dokument",
    bDocs.length === 1 && bDocs[0].id === docB.id,
  );

  // 3. Full-text search (tenant scoped) finds by OCR content, no cross-leak
  const hitA = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Document"
    WHERE "tenantId" = ${a.id}
      AND "searchVector" @@ plainto_tsquery('simple', ${"tahionski"})`;
  check(
    "FTS nalazi dokument po riječi iz OCR-a (nije u nazivu)",
    hitA.length === 1 && hitA[0].id === docA.id,
  );
  const leak = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Document"
    WHERE "tenantId" = ${b.id}
      AND "searchVector" @@ plainto_tsquery('simple', ${"tahionski"})`;
  check("FTS ne curi A-jev pogodak u firmu B", leak.length === 0);

  console.log(
    `\n${failures === 0 ? "SVE PROŠLO ✅" : failures + " PROVJERA NEUSPJEŠNO ❌"}`,
  );
  console.log(`COOKIE=novidms_session=${token}`);
  console.log(`TENANT_A_NAME=${A_NAME}`);

  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
