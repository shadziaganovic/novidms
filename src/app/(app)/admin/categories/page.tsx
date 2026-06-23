import { requireAdminContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { CategoryCreateForm } from "@/components/CategoryCreateForm";
import { CategoryRow } from "@/components/CategoryRow";

export default async function CategoriesPage() {
  const ctx = await requireAdminContext();

  const categories = await prisma.category.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { documents: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Kategorije</h1>
        <p className="text-sm text-slate-500">
          Kategorije za razvrstavanje dokumenata vaše firme.
        </p>
      </div>

      <div className="card p-5">
        <CategoryCreateForm />
      </div>

      {categories.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          Još nema kategorija.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Naziv</th>
                <th className="px-4 py-3 font-medium">Dokumenata</th>
                <th className="px-4 py-3 text-right font-medium">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((c) => (
                <CategoryRow
                  key={c.id}
                  id={c.id}
                  name={c.name}
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
