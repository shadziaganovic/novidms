import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { ProcessForm } from "@/components/ProcessForm";
import { parseSteps } from "@/lib/workflow";

export default async function EditWorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") {
    return <p className="text-slate-500">Samo administrator firme.</p>;
  }
  const { id } = await params;
  const w = await prisma.workflowDefinition.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { id: true, name: true, description: true, steps: true },
  });
  if (!w) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">Uredi proces</h1>
      <div className="card p-5">
        <ProcessForm
          workflow={{
            id: w.id,
            name: w.name,
            description: w.description ?? "",
            steps: parseSteps(w.steps),
          }}
        />
      </div>
    </div>
  );
}
