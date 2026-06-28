import { getTenantContext } from "@/lib/tenant";
import { TemplateForm } from "@/components/TemplateForm";

export default async function NewTemplatePage() {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") {
    return <p className="text-slate-500">Samo administrator firme.</p>;
  }
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">Novi predložak</h1>
      <div className="card p-5">
        <TemplateForm />
      </div>
    </div>
  );
}
