import { getTenantContext } from "@/lib/tenant";
import { ProcessForm } from "@/components/ProcessForm";

export default async function NewWorkflowPage() {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") {
    return <p className="text-slate-500">Samo administrator firme.</p>;
  }
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">Novi proces</h1>
      <div className="card p-5">
        <ProcessForm />
      </div>
    </div>
  );
}
