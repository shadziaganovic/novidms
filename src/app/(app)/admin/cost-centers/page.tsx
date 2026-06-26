import { requireAdminContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { CostCenterCreateForm } from "@/components/CostCenterCreateForm";
import { CostCenterRow } from "@/components/CostCenterRow";
import { formatMoney } from "@/lib/format";

export default async function CostCentersPage() {
  const ctx = await requireAdminContext();

  const [centers, sums] = await Promise.all([
    prisma.costCenter.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        _count: { select: { documents: true } },
      },
    }),
    prisma.document.groupBy({
      by: ["costCenterId"],
      where: { tenantId: ctx.tenantId, costCenterId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const totalByCenter = new Map<string, number>();
  for (const s of sums) {
    if (s.costCenterId) {
      totalByCenter.set(s.costCenterId, Number(s._sum.amount ?? 0));
    }
  }
  const grandTotal = [...totalByCenter.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Troškovni centri</h1>
        <p className="text-sm text-slate-500">
          Grupirajte dokumente po troškovnom centru (npr. stan / nekretnina) i
          pratite ukupan trošak po centru.
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
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Naziv · šifra</th>
                <th className="px-4 py-3 font-medium">Dokumenata</th>
                <th className="px-4 py-3 text-right font-medium">
                  Ukupan iznos
                </th>
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
                  total={totalByCenter.get(c.id) ?? 0}
                />
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50 text-sm">
              <tr>
                <td className="px-4 py-3 font-semibold text-slate-700">
                  Ukupno
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                  {formatMoney(grandTotal)}
                </td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
