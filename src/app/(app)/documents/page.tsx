import Link from "next/link";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { findDocuments, sumDocuments, type SortKey } from "@/lib/document-list";
import { StatusPill } from "@/components/StatusPill";
import { formatBytes } from "@/lib/documents";
import { formatDate, formatMoney } from "@/lib/format";

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

function sortHref(
  col: SortKey,
  sort: string,
  dir: string,
  q: string,
  cat: string,
  cc: string,
): string {
  const nextDir = sort === col && dir === "asc" ? "desc" : "asc";
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (cat) p.set("cat", cat);
  if (cc) p.set("cc", cc);
  p.set("sort", col);
  p.set("dir", nextDir);
  return `/documents?${p.toString()}`;
}

function SortTh({
  col,
  label,
  sort,
  dir,
  q,
  cat,
  cc,
  align = "left",
}: {
  col: SortKey;
  label: string;
  sort: string;
  dir: string;
  q: string;
  cat: string;
  cc: string;
  align?: "left" | "right";
}) {
  const active = sort === col;
  const arrow = !active ? "↕" : dir === "asc" ? "▲" : "▼";
  return (
    <th className={`px-4 py-3 font-medium ${align === "right" ? "text-right" : ""}`}>
      <Link
        href={sortHref(col, sort, dir, q, cat, cc)}
        className={`inline-flex items-center gap-1 hover:text-slate-700 ${
          active ? "text-slate-700" : ""
        }`}
      >
        {label}
        <span className="text-[10px] text-slate-400">{arrow}</span>
      </Link>
    </th>
  );
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    cat?: string;
    cc?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const ctx = await getTenantContext();
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const categoryId = sp.cat || undefined;
  const costCenterId = sp.cc || undefined;
  const sort = sp.sort ?? "";
  const dir = sp.dir === "desc" ? "desc" : "asc";
  const filter = { tenantId: ctx.tenantId, q: query, categoryId, costCenterId };

  const [rows, totals, categories, costCenters] = await Promise.all([
    findDocuments({ ...filter, sort, dir }),
    sumDocuments(filter),
    prisma.category.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.costCenter.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);

  const cat = sp.cat ?? "";
  const cc = sp.cc ?? "";
  const filtering = query.length > 0 || !!categoryId || !!costCenterId;
  const noun = totals.count === 1 ? (filtering ? "rezultat" : "dokument") : filtering ? "rezultata" : "dokumenata";

  const exportParams = new URLSearchParams();
  if (query) exportParams.set("q", query);
  if (cat) exportParams.set("cat", cat);
  if (cc) exportParams.set("cc", cc);
  const exportQs = exportParams.toString();
  const exportHref = `/api/documents/export${exportQs ? `?${exportQs}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dokumenti</h1>
        <div className="flex items-center gap-2">
          <a href={exportHref} className="btn-secondary btn-sm">
            Izvoz u Excel
          </a>
          <Link href="/documents/new" className="btn-primary btn-sm">
            Dodaj dokument
          </Link>
        </div>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
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
          <select id="cat" name="cat" defaultValue={cat} className="input">
            <option value="">Sve kategorije</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cc">
            Troškovni centar
          </label>
          <select id="cc" name="cc" defaultValue={cc} className="input">
            <option value="">Svi centri</option>
            {costCenters.map((center) => (
              <option key={center.id} value={center.id}>
                {center.code ? `${center.code} · ${center.name}` : center.name}
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
        {totals.count} {noun} · Ukupan iznos:{" "}
        <span className="font-semibold text-slate-700">
          {formatMoney(totals.total)}
        </span>
        {totals.count > rows.length ? (
          <span className="text-slate-400"> (prikazano prvih {rows.length})</span>
        ) : null}
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
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <SortTh col="title" label="Naziv" sort={sort} dir={dir} q={query} cat={cat} cc={cc} />
                <SortTh col="category" label="Kategorija" sort={sort} dir={dir} q={query} cat={cat} cc={cc} />
                <SortTh col="costcenter" label="Troškovni centar" sort={sort} dir={dir} q={query} cat={cat} cc={cc} />
                <SortTh col="partner" label="Partner" sort={sort} dir={dir} q={query} cat={cat} cc={cc} />
                <SortTh col="amount" label="Iznos" sort={sort} dir={dir} q={query} cat={cat} cc={cc} align="right" />
                <SortTh col="date" label="Datum" sort={sort} dir={dir} q={query} cat={cat} cc={cc} />
                <SortTh col="status" label="Status" sort={sort} dir={dir} q={query} cat={cat} cc={cc} />
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
                    {d.costCenterName
                      ? d.costCenterCode
                        ? `${d.costCenterCode} · ${d.costCenterName}`
                        : d.costCenterName
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {d.partner ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-700">
                    {d.amount != null ? formatMoney(d.amount) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(d.documentDate ?? d.createdAt)}
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
