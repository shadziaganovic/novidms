import Link from "next/link";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function FromTemplatePage() {
  const ctx = await getTenantContext();
  const templates = await prisma.documentTemplate.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Novi dokument iz predloška
        </h1>
        <p className="text-sm text-slate-500">
          Odaberi predložak, ispuni polja i generiraj gotov PDF — sprema se među
          dokumente.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <p>Još nema predložaka.</p>
          {ctx.role === "ADMIN" ? (
            <Link
              href="/admin/templates/new"
              className="mt-3 inline-block font-semibold text-brand-600 hover:underline"
            >
              Dodaj predložak
            </Link>
          ) : (
            <p className="mt-1 text-sm">
              Zatraži od administratora da doda predložak.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/documents/from-template/${t.id}`}
              className="card p-4 transition hover:border-brand-300 hover:shadow-sm"
            >
              <p className="font-medium text-slate-800">{t.name}</p>
              {t.description ? (
                <p className="mt-1 text-sm text-slate-500">{t.description}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
