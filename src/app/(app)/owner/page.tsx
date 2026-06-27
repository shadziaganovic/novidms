import { requirePlatformOwner } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import { tenantIsActive, trialDaysLeft } from "@/lib/entitlement";
import { activateTenant, suspendTenant, extendTrial } from "@/app/actions/owner";

// Cross-tenant back-office. This is the ONE place that reads across firms — it is
// guarded by requirePlatformOwner(); every other query stays tenant-scoped.

function formatBytes(n: number): string {
  if (n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  const v = n / Math.pow(1024, i);
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function fmtDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString("hr-HR") : "—";
}

const STATUS_LABEL: Record<string, string> = {
  TRIAL: "Proba",
  ACTIVE: "Aktivna",
  SUSPENDED: "Suspendirana",
};

export default async function OwnerPage() {
  await requirePlatformOwner();

  const [tenantCount, statusGroups, userCount, docAgg, storageByTenant, tenants] =
    await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.groupBy({ by: ["status"], _count: true }),
      prisma.user.count(),
      prisma.document.aggregate({ _count: true, _sum: { sizeBytes: true } }),
      prisma.document.groupBy({ by: ["tenantId"], _sum: { sizeBytes: true } }),
      prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          trialEndsAt: true,
          createdAt: true,
          _count: { select: { users: true, documents: true } },
        },
      }),
    ]);

  const statusCount: Record<string, number> = {
    TRIAL: 0,
    ACTIVE: 0,
    SUSPENDED: 0,
  };
  for (const g of statusGroups) statusCount[g.status] = g._count;

  const storageMap = new Map<string, number>();
  for (const g of storageByTenant) {
    storageMap.set(g.tenantId, g._sum.sizeBytes ?? 0);
  }
  const totalStorage = docAgg._sum.sizeBytes ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vlasnički pregled</h1>
        <p className="text-sm text-slate-500">
          Sve firme na platformi (Docorex)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm text-slate-500">Firme</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{tenantCount}</p>
          <p className="mt-1 text-xs text-slate-500">
            {statusCount.ACTIVE} aktivne · {statusCount.TRIAL} probne ·{" "}
            {statusCount.SUSPENDED} susp.
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Korisnici</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{userCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Dokumenti</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {docAgg._count}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Storage</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {formatBytes(totalStorage)}
          </p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-4 py-3 font-medium">Firma</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Otvorena</th>
              <th className="px-4 py-3 font-medium">Proba</th>
              <th className="px-4 py-3 text-right font-medium">Kor.</th>
              <th className="px-4 py-3 text-right font-medium">Dok.</th>
              <th className="px-4 py-3 text-right font-medium">Storage</th>
              <th className="px-4 py-3 font-medium">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => {
              const active = tenantIsActive(t);
              const left = trialDaysLeft(t);
              const badge = !active
                ? "bg-red-100 text-red-700"
                : t.status === "TRIAL"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-700";
              return (
                <tr key={t.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {t.name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badge}`}
                    >
                      {active ? STATUS_LABEL[t.status] : "Istekla"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {fmtDate(t.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {t.status === "TRIAL"
                      ? `${fmtDate(t.trialEndsAt)}${
                          left != null
                            ? ` (${left === 0 ? "isteklo" : `${left} d`})`
                            : ""
                        }`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {t._count.users}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {t._count.documents}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {formatBytes(storageMap.get(t.id) ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <form action={activateTenant.bind(null, t.id)}>
                        <button
                          type="submit"
                          className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          Aktiviraj
                        </button>
                      </form>
                      <form action={extendTrial.bind(null, t.id)}>
                        <button
                          type="submit"
                          className="rounded bg-amber-500 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                        >
                          +30 dana
                        </button>
                      </form>
                      <form action={suspendTenant.bind(null, t.id)}>
                        <button
                          type="submit"
                          className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                        >
                          Suspendiraj
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
