import Link from "next/link";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { deleteTemplate } from "@/app/actions/templates";
import { parseTemplateFields } from "@/lib/templates";
import { formatDate } from "@/lib/format";

export default async function TemplatesPage() {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") {
    return <p className="text-slate-500">Samo administrator firme.</p>;
  }

  const templates = await prisma.documentTemplate.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      fields: true,
      updatedAt: true,
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Predlošci</h1>
          <p className="text-sm text-slate-500">
            Predlošci za kreiranje dokumenata (npr. odluke). Korisnici ih
            popunjavaju i generiraju gotov dokument.
          </p>
        </div>
        <Link href="/admin/templates/new" className="btn-primary btn-sm">
          Novi predložak
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <p>Još nema predložaka.</p>
          <Link
            href="/admin/templates/new"
            className="mt-3 inline-block font-semibold text-brand-600 hover:underline"
          >
            Dodaj prvi predložak
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {templates.map((t) => {
            const count = parseTemplateFields(t.fields).length;
            return (
              <div
                key={t.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{t.name}</p>
                  {t.description ? (
                    <p className="truncate text-sm text-slate-500">
                      {t.description}
                    </p>
                  ) : null}
                  <p className="text-xs text-slate-400">
                    {count} {count === 1 ? "polje" : "polja"} · ažurirano{" "}
                    {formatDate(t.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <Link
                    href={`/admin/templates/${t.id}`}
                    className="text-brand-600 hover:underline"
                  >
                    Uredi
                  </Link>
                  <form action={deleteTemplate}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="text-red-600 hover:underline">
                      Obriši
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
