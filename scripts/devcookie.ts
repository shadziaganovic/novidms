/*
 * Print a valid session cookie for an existing user, for testing protected
 * endpoints with curl. Usage:  npx tsx scripts/devcookie.ts dev@novidms.local
 */
import { prisma } from "../src/lib/prisma";
import { createSessionToken } from "../src/lib/auth";

async function main() {
  const email = process.argv[2] ?? "dev@novidms.local";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Nema korisnika: ${email}`);
    process.exit(1);
  }
  const token = await createSessionToken({
    uid: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });
  console.log(`novidms_session=${token}`);
  await prisma.$disconnect();
}

main();
