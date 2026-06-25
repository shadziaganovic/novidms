import { requireAdminContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { CostCenterCreateForm } from "@/components/CostCenterCreateForm";
import { CostCenterRow } from "@/components/CostCenterRow";

export default async function CostCentersPage() {
  const ctx = await requireAdminContext();

  const centers = await prisma.costCenter.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      _count: { select: { documents: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Troškovni centri</h1>
        <p className="text-sm text-slate-500">
          Grupirajte dokumente po troškovnom centru (npr. stan / nekretnina).
        </p>
      </div>

      <div className="card p-5">
        <CostCenterCreateForm />
      </div>

      {centers.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          Još nema troškovnih centara.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Naziv · šifra</th>
                <th className="px-4 py-3 font-medium">Dokumenata</th>
                <th className="px-4 py-3 text-right font-medium">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {centers.map((c) => (
                <CostCenterRow
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  code={c.code}
                  count={c._count.documents}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
