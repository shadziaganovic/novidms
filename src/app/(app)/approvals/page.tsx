import Link from "next/link";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { ApprovalActions } from "@/components/ApprovalActions";

export default async function ApprovalsPage() {
  const ctx = await getTenantContext();

  // Steps assigned to me, pending, in active instances.
  const steps = await prisma.workflowStepInstance.findMany({
    where: {
      approverId: ctx.userId,
      decision: "PENDING",
      instance: { tenantId: ctx.tenantId, status: "IN_PROGRESS" },
    },
    include: {
      instance: {
        select: {
          id: true,
          currentStep: true,
          documentId: true,
          processName: true,
        },
      },
    },
  });
  // Only the step that is actually the current one is actionable.
  const mine = steps.filter((s) => s.idx === s.instance.currentStep);

  const docIds = [...new Set(mine.map((s) => s.instance.documentId))];
  const docs = docIds.length
    ? await prisma.document.findMany({
        where: { id: { in: docIds }, tenantId: ctx.tenantId },
        select: { id: true, title: true },
      })
    : [];
  const docTitle = (id: string) =>
    docs.find((d) => d.id === id)?.title ?? "Dokument";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Moja odobravanja</h1>
        <p className="text-sm text-slate-500">
          Dokumenti koji čekaju tvoje odobrenje.
        </p>
      </div>

      {mine.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <p>Nemaš dokumenata na čekanju.</p>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {mine.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-start justify-between gap-4 p-4"
            >
              <div className="min-w-0">
                <Link
                  href={`/documents/${s.instance.documentId}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {docTitle(s.instance.documentId)}
                </Link>
                <p className="text-sm text-slate-500">
                  {s.instance.processName} · korak: {s.label}
                </p>
              </div>
              <ApprovalActions stepId={s.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
