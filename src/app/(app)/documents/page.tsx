import Link from "next/link";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { StatusPill } from "@/components/StatusPill";
import { formatBytes } from "@/lib/documents";
import { formatDate } from "@/lib/format";

// NOTE: full-text search + category filter UI lands in Task 6. This is the base
// tenant-scoped list.
export default async function DocumentsPage() {
  const ctx = await getTenantContext();

  const documents = await prisma.document.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      partner: true,
      documentDate: true,
      ocrStatus: true,
      sizeBytes: true,
      createdAt: true,
      category: { select: { name: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dokumenti</h1>
        <Link href="/documents/new" className="btn-primary btn-sm">
          Dodaj dokument
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <p>Još nema dokumenata.</p>
          <Link
            href="/documents/new"
            className="mt-3 inline-block font-semibold text-brand-600 hover:underline"
          >
            Dodajte prvi dokument
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Naziv</th>
                <th className="px-4 py-3 font-medium">Kategorija</th>
                <th className="px-4 py-3 font-medium">Partner</th>
                <th className="px-4 py-3 font-medium">Datum</th>
                <th className="px-4 py-3 font-medium">Veličina</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/documents/${d.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {d.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {d.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {d.partner ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(d.documentDate ?? d.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatBytes(d.sizeBytes)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={d.ocrStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
