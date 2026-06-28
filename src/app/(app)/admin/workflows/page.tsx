import Link from "next/link";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { deleteWorkflow } from "@/app/actions/workflows";
import { parseSteps } from "@/lib/workflow";
import { formatDate } from "@/lib/format";

export default async function WorkflowsPage() {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") {
    return <p className="text-slate-500">Samo administrator firme.</p>;
  }

  const workflows = await prisma.workflowDefinition.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      steps: true,
      updatedAt: true,
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Procesi odobravanja
          </h1>
          <p className="text-sm text-slate-500">
            Definiraj procese (korake odobravanja). Korisnici ih pokreću na
            dokumentima i biraju tko odobrava svaki korak.
          </p>
        </div>
        <Link href="/admin/workflows/new" className="btn-primary btn-sm">
          Novi proces
        </Link>
      </div>

      {workflows.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <p>Još nema procesa.</p>
          <Link
            href="/admin/workflows/new"
            className="mt-3 inline-block font-semibold text-brand-600 hover:underline"
          >
            Dodaj prvi proces
          </Link>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {workflows.map((w) => {
            const steps = parseSteps(w.steps);
            return (
              <div
                key={w.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{w.name}</p>
                  {w.description ? (
                    <p className="truncate text-sm text-slate-500">
                      {w.description}
                    </p>
                  ) : null}
                  <p className="text-xs text-slate-400">
                    {steps.length} {steps.length === 1 ? "korak" : "koraka"}
                    {steps.length > 0 ? `: ${steps.join(" → ")}` : ""} · ažurirano{" "}
                    {formatDate(w.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <Link
                    href={`/admin/workflows/${w.id}`}
                    className="text-brand-600 hover:underline"
                  >
                    Uredi
                  </Link>
                  <form action={deleteWorkflow}>
                    <input type="hidden" name="id" value={w.id} />
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
