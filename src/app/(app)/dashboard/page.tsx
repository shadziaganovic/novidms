import Link from "next/link";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const ctx = await getTenantContext();

  const [tenant, docCount, categoryCount, userCount] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { name: true },
    }),
    prisma.document.count({ where: { tenantId: ctx.tenantId } }),
    prisma.category.count({ where: { tenantId: ctx.tenantId } }),
    prisma.user.count({ where: { tenantId: ctx.tenantId } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{tenant?.name}</h1>
        <p className="text-sm text-slate-500">Nadzorna ploča</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Dokumenti</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{docCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Kategorije</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {categoryCount}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Korisnici</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{userCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/documents" className="btn-primary">
          Dokumenti
        </Link>
        <Link href="/documents/new" className="btn-secondary">
          Dodaj dokument
        </Link>
      </div>
    </div>
  );
}
