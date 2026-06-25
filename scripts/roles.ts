/*
 * Sets up a MEMBER and an invited (pending) user in the demo tenant to test
 * role restrictions + the invite link over HTTP. Prints a forged MEMBER cookie.
 * Cleanup:  npx tsx scripts/roles.ts cleanup
 */
import { scryptSync, randomBytes } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/auth";

function hashPassword(p: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(p, salt, 64).toString("hex")}`;
}

const MEMBER_EMAIL = "member@zz-test.local";
const INVITED_EMAIL = "pozvani@zz-test.local";

async function cleanup() {
  await prisma.user.deleteMany({
    where: { email: { in: [MEMBER_EMAIL, INVITED_EMAIL] } },
  });
}

async function main() {
  if (process.argv.includes("cleanup")) {
    await cleanup();
    console.log("ROLES test podaci očišćeni.");
    await prisma.$disconnect();
    return;
  }

  const demo = await prisma.user.findUnique({
    where: { email: "dev@novidms.local" },
    select: { tenantId: true },
  });
  if (!demo) throw new Error("Demo korisnik ne postoji — pokreni `npm run db:seed`.");

  await cleanup();

  const member = await prisma.user.create({
    data: {
      tenantId: demo.tenantId,
      email: MEMBER_EMAIL,
      name: "Test Član",
      password: hashPassword("lozinka123"),
      role: "MEMBER",
      acceptedAt: new Date(),
    },
  });
  await prisma.user.create({
    data: {
      tenantId: demo.tenantId,
      email: INVITED_EMAIL,
      name: "Pozvani Korisnik",
      password: hashPassword(randomBytes(24).toString("hex")),
      role: "MEMBER",
      invitedAt: new Date(),
    },
  });

  const memberCookie = await createSessionToken({
    uid: member.id,
    tenantId: member.tenantId,
    role: "MEMBER",
  });

  console.log(`MEMBER_COOKIE=${memberCookie}`);
  console.log(`INVITED_EMAIL=${INVITED_EMAIL}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
