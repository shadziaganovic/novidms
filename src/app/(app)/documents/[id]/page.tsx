import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { StatusPill } from "@/components/StatusPill";
import { DocumentMetaForm } from "@/components/DocumentMetaForm";
import { DeleteDocumentButton } from "@/components/DeleteDocumentButton";
import { formatBytes, ALLOWED_MIME } from "@/lib/documents";
import { formatDate, formatDateTime } from "@/lib/format";

const AUDIT_LABEL: Record<string, string> = {
  UPLOAD: "Dodano",
  VIEW: "Pregledano",
  DOWNLOAD: "Preuzeto",
  DELETE: "Obrisano",
};

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">
        {value}
      </span>
    </div>
  );
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getTenantContext();
  const { id } = await params;

  const doc = await prisma.document.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: {
      id: true,
      title: true,
      description: true,
      partner: true,
      documentDate: true,
      mimeType: true,
      sizeBytes: true,
      ocrText: true,
      ocrStatus: true,
      createdAt: true,
      categoryId: true,
      costCenterId: true,
      uploadedById: true,
      category: { select: { name: true } },
      costCenter: { select: { name: true, code: true } },
    },
  });
  if (!doc) notFound();

  const [uploader, history, categories, costCenters] = await Promise.all([
    prisma.user.findFirst({
      where: { id: doc.uploadedById, tenantId: ctx.tenantId },
      select: { name: true },
    }),
    prisma.auditEntry.findMany({
      where: { tenantId: ctx.tenantId, documentId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    ctx.role === "ADMIN"
      ? prisma.category.findMany({
          where: { tenantId: ctx.tenantId },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([] as { id: string; name: string }[]),
    ctx.role === "ADMIN"
      ? prisma.costCenter.findMany({
          where: { tenantId: ctx.tenantId },
          orderBy: { name: "asc" },
          select: { id: true, name: true, code: true },
        })
      : Promise.resolve(
          [] as { id: string; name: string; code: string | null }[],
        ),
  ]);

  const actorIds = [...new Set(history.map((h) => h.userId))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds }, tenantId: ctx.tenantId },
    select: { id: true, name: true },
  });
  const actorName = (uid: string) =>
    actors.find((u) => u.id === uid)?.name ?? "—";

  // Record the view after the response is sent (does not block render).
  after(() =>
    logAudit({
      tenantId: ctx.tenantId,
      documentId: id,
      userId: ctx.userId,
      action: "VIEW",
    }),
  );

  const typeLabel = ALLOWED_MIME[doc.mimeType]?.label ?? doc.mimeType;
  const isPdf = doc.mimeType === "application/pdf";
  const isImage =
    doc.mimeType === "image/png" || doc.mimeType === "image/jpeg";
  const rawUrl = `/api/documents/${doc.id}/raw`;
  const costCenterLabel = doc.costCenter
    ? doc.costCenter.code
      ? `${doc.costCenter.code} · ${doc.costCenter.name}`
      : doc.costCenter.name
    : "—";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/documents"
            className="text-sm text-slate-500 hover:underline"
          >
            ← Dokumenti
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{doc.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/documents/${doc.id}/download`}
            className="btn-secondary btn-sm"
          >
            Preuzmi
          </a>
          {ctx.role === "ADMIN" ? <DeleteDocumentButton id={doc.id} /> : null}
        </div>
      </div>

      {/* In-browser preview */}
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">
          Pregled
        </h2>
        {isPdf ? (
          <iframe
            src={rawUrl}
            title={doc.title}
            className="h-[70vh] w-full rounded-lg border border-slate-200"
          />
        ) : isImage ? (
          <div className="flex justify-center rounded-lg border border-slate-200 bg-slate-50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rawUrl}
              alt={doc.title}
              className="max-h-[70vh] w-auto object-contain"
            />
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Pregled u pregledniku nije dostupan za ovaj tip datoteke (DOCX).
            Prepoznati tekst je prikazan niže, a izvornik preuzmite gumbom
            „Preuzmi".
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Metadata */}
        <div className="card p-5 lg:col-span-1">
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">
            Metapodaci
          </h2>
          <MetaRow label="Kategorija" value={doc.category?.name ?? "—"} />
          <MetaRow label="Troškovni centar" value={costCenterLabel} />
          <MetaRow label="Partner" value={doc.partner ?? "—"} />
          <MetaRow
            label="Datum dokumenta"
            value={doc.documentDate ? formatDate(doc.documentDate) : "—"}
          />
          <MetaRow label="Tip" value={typeLabel} />
          <MetaRow label="Veličina" value={formatBytes(doc.sizeBytes)} />
          <MetaRow label="Dodao" value={uploader?.name ?? "—"} />
          <MetaRow label="Dodano" value={formatDateTime(doc.createdAt)} />
          <MetaRow label="OCR" value={<StatusPill status={doc.ocrStatus} />} />
          {doc.description ? (
            <p className="mt-3 text-sm text-slate-600">{doc.description}</p>
          ) : null}
        </div>

        {/* OCR text */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold uppercase text-slate-500">
            Prepoznati tekst (OCR)
          </h2>
          {doc.ocrStatus === "DONE" && doc.ocrText ? (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              {doc.ocrText}
            </pre>
          ) : doc.ocrStatus === "DONE" ? (
            <p className="text-sm text-slate-500">
              Nije pronađen tekst u dokumentu.
            </p>
          ) : doc.ocrStatus === "FAILED" ? (
            <p className="text-sm text-red-600">OCR obrada nije uspjela.</p>
          ) : (
            <p className="text-sm text-slate-500">OCR obrada je u tijeku…</p>
          )}
        </div>
      </div>

      {/* Edit (admin only) */}
      {ctx.role === "ADMIN" ? (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">
            Uredi metapodatke
          </h2>
          <DocumentMetaForm
            doc={{
              id: doc.id,
              title: doc.title,
              description: doc.description,
              partner: doc.partner,
              documentDateValue: doc.documentDate
                ? doc.documentDate.toISOString().slice(0, 10)
                : "",
              categoryId: doc.categoryId,
              costCenterId: doc.costCenterId,
            }}
            categories={categories}
            costCenters={costCenters}
          />
        </div>
      ) : null}

      {/* History */}
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">
          Povijest
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">Nema zapisa.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between border-b border-slate-100 py-1.5 last:border-0"
              >
                <span className="text-slate-700">
                  <span className="font-medium">
                    {AUDIT_LABEL[h.action] ?? h.action}
                  </span>{" "}
                  — {actorName(h.userId)}
                </span>
                <span className="text-slate-400">
                  {formatDateTime(h.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
