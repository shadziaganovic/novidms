import Link from "next/link";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { findDocuments } from "@/lib/document-list";
import { StatusPill } from "@/components/StatusPill";
import { formatBytes } from "@/lib/documents";
import { formatDate } from "@/lib/format";

// Escape HTML, then turn our [[HL]] sentinels into <mark>. Safe to feed into
// dangerouslySetInnerHTML — document content is escaped, only <mark> survives.
function highlight(value: string): string {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replaceAll("[[HL]]", "<mark>")
    .replaceAll("[[/HL]]", "</mark>");
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const ctx = await getTenantContext();
  const { q, cat } = await searchParams;
  const query = q?.trim() ?? "";
  const categoryId = cat || undefined;

  const [rows, categories] = await Promise.all([
    findDocuments({ tenantId: ctx.tenantId, q: query, categoryId }),
    prisma.category.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const filtering = query.length > 0 || !!categoryId;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dokumenti</h1>
        <Link href="/documents/new" className="btn-primary btn-sm">
          Dodaj dokument
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <label className="label" htmlFor="q">
            Pretraga po sadržaju
          </label>
          <input
            id="q"
            name="q"
            defaultValue={query}
            placeholder="npr. riječ iz dokumenta, partner, naziv…"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="cat">
            Kategorija
          </label>
          <select
            id="cat"
            name="cat"
            defaultValue={categoryId ?? ""}
            className="input"
          >
            <option value="">Sve kategorije</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          Traži
        </button>
        {filtering ? (
          <Link href="/documents" className="btn-ghost">
            Očisti
          </Link>
        ) : null}
      </form>

      <p className="text-sm text-slate-500">
        {filtering
          ? `${rows.length} ${rows.length === 1 ? "rezultat" : "rezultata"}`
          : `${rows.length} ${rows.length === 1 ? "dokument" : "dokumenata"}`}
      </p>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          {filtering ? (
            <p>Nema rezultata za zadanu pretragu.</p>
          ) : (
            <>
              <p>Još nema dokumenata.</p>
              <Link
                href="/documents/new"
                className="mt-3 inline-block font-semibold text-brand-600 hover:underline"
              >
                Dodajte prvi dokument
              </Link>
            </>
          )}
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
              {rows.map((d) => (
                <tr key={d.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/documents/${d.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {query && d.titleHL ? (
                        <span
                          dangerouslySetInnerHTML={{
                            __html: highlight(d.titleHL),
                          }}
                        />
                      ) : (
                        d.title
                      )}
                    </Link>
                    {query && d.snippet ? (
                      <p
                        className="mt-1 text-xs text-slate-500"
                        dangerouslySetInnerHTML={{
                          __html: highlight(d.snippet),
                        }}
                      />
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {d.categoryName ?? "—"}
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
