import Link from "next/link";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { logout } from "@/app/actions/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getTenantContext();
  const [user, tenant] = await Promise.all([
    prisma.user.findFirst({
      where: { id: ctx.userId, tenantId: ctx.tenantId },
      select: { name: true },
    }),
    prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { name: true },
    }),
  ]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-bold text-slate-900">
              NOVIDMS
            </Link>
            <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
              <Link href="/documents" className="hover:text-brand-600">
                Dokumenti
              </Link>
              {ctx.role === "ADMIN" ? (
                <>
                  <Link href="/admin/categories" className="hover:text-brand-600">
                    Kategorije
                  </Link>
                  <Link href="/admin/users" className="hover:text-brand-600">
                    Korisnici
                  </Link>
                </>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">
              {user?.name} · {tenant?.name}
            </span>
            <form action={logout}>
              <button type="submit" className="btn-ghost btn-sm">
                Odjava
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
