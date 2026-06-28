import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { TemplateForm } from "@/components/TemplateForm";
import { parseTemplateFields } from "@/lib/templates";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getTenantContext();
  if (ctx.role !== "ADMIN") {
    return <p className="text-slate-500">Samo administrator firme.</p>;
  }
  const { id } = await params;
  const t = await prisma.documentTemplate.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: {
      id: true,
      name: true,
      description: true,
      body: true,
      fields: true,
      kind: true,
      fileKey: true,
    },
  });
  if (!t) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">Uredi predložak</h1>
      <div className="card p-5">
        <TemplateForm
          template={{
            id: t.id,
            name: t.name,
            description: t.description ?? "",
            body: t.body,
            kind: t.kind === "DOCX" ? "DOCX" : "TEXT",
            hasFile: !!t.fileKey,
            fields: parseTemplateFields(t.fields),
          }}
        />
      </div>
    </div>
  );
}
