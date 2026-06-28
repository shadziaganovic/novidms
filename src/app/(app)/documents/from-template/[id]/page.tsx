import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { FillTemplateForm } from "@/components/FillTemplateForm";
import { parseTemplateFields } from "@/lib/templates";

export default async function FillTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getTenantContext();
  const { id } = await params;
  const t = await prisma.documentTemplate.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: { id: true, name: true, description: true, fields: true },
  });
  if (!t) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/documents/from-template"
          className="text-sm text-slate-500 hover:text-brand-600"
        >
          ← Predlošci
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{t.name}</h1>
        {t.description ? (
          <p className="text-sm text-slate-500">{t.description}</p>
        ) : null}
      </div>
      <div className="card p-5">
        <FillTemplateForm
          templateId={t.id}
          fields={parseTemplateFields(t.fields)}
        />
      </div>
    </div>
  );
}
