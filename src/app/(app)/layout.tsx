import Link from "next/link";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { ProfileMenu } from "@/components/ProfileMenu";
import { tenantIsActive, trialDaysLeft, restrictedMessage } from "@/lib/entitlement";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "info@docorex.com";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getTenantContext();
  const [user, tenant] = await Promise.all([
    prisma.user.findFirst({
      where: { id: ctx.userId, tenantId: ctx.tenantId },
      select: { name: true, email: true, platformAdmin: true },
    }),
    prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { name: true, status: true, trialEndsAt: true },
    }),
  ]);

  const active = tenant ? tenantIsActive(tenant) : true;
  const daysLeft = tenant ? trialDaysLeft(tenant) : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-bold text-slate-900">
              Docorex
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
              <Link href="/documents" className="hover:text-brand-600">
                Dokumenti
              </Link>
              {ctx.role === "ADMIN" ? (
                <>
                  <Link
                    href="/admin/cost-centers"
                    className="hover:text-brand-600"
                  >
                    Troškovni centri
                  </Link>
                  <Link href="/admin/categories" className="hover:text-brand-600">
                    Kategorije
                  </Link>
                  <Link href="/admin/users" className="hover:text-brand-600">
                    Korisnici
                  </Link>
                  <Link href="/admin/templates" className="hover:text-brand-600">
                    Predlošci
                  </Link>
                </>
              ) : null}
              {user?.platformAdmin ? (
                <Link
                  href="/owner"
                  className="font-semibold text-brand-600 hover:underline"
                >
                  Vlasnik
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-400 sm:inline">
              {tenant?.name}
            </span>
            <ProfileMenu
              name={user?.name ?? ""}
              email={user?.email ?? ""}
              isAdmin={ctx.role === "ADMIN"}
            />
          </div>
        </div>
      </header>

      {tenant && !active ? (
        <div className="border-b border-red-200 bg-red-50">
          <div className="mx-auto max-w-5xl px-4 py-2 text-sm text-red-700">
            <span className="font-semibold">Pristup je ograničen.</span>{" "}
            {restrictedMessage(tenant.status)} Pregled, pretraga i izvoz rade;
            dodavanje dokumenata i pozivanje korisnika su onemogućeni. Pišite na{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-semibold underline"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </div>
        </div>
      ) : daysLeft != null ? (
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="mx-auto max-w-5xl px-4 py-2 text-sm text-amber-800">
            Probno razdoblje — još{" "}
            <span className="font-semibold">
              {daysLeft} {daysLeft === 1 ? "dan" : "dana"}
            </span>
            . Za trajnu aktivaciju pišite na{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-semibold underline"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
