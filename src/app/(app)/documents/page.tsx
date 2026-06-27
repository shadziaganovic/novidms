import { Fragment } from "react";
import Link from "next/link";
import { getTenantContext } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import {
  findDocuments,
  sumDocuments,
  listDocumentYears,
  type SortKey,
  type DocRow,
} from "@/lib/document-list";
import { StatusPill } from "@/components/StatusPill";
import { formatDate, formatMoney, formatMonthYear, MONTHS_HR } from "@/lib/format";

// Number of columns in the table — used for the group header colSpan.
const COLS = 7;

// Page-size choices for the list.
const PER_OPTIONS = ["10", "25", "50", "100"] as const;
const DEFAULT_PER = "25";

type ListParams = {
  sort: string;
  dir: "asc" | "desc";
  q: string;
  cat: string;
  cc: string;
  year: string;
  month: string;
  group: boolean;
  per: string;
  page: number;
};

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

function sortHref(col: SortKey, p: ListParams): string {
  const nextDir = p.sort === col && p.dir === "asc" ? "desc" : "asc";
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.cat) sp.set("cat", p.cat);
  if (p.cc) sp.set("cc", p.cc);
  if (p.year) sp.set("year", p.year);
  if (p.month) sp.set("month", p.month);
  if (p.group) sp.set("group", "month");
  if (p.per !== DEFAULT_PER) sp.set("per", p.per);
  sp.set("sort", col);
  sp.set("dir", nextDir);
  return `/documents?${sp.toString()}`;
}

// Link that changes only the page size, preserving the current filters/sort.
function perHref(value: string, p: ListParams): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.cat) sp.set("cat", p.cat);
  if (p.cc) sp.set("cc", p.cc);
  if (p.year) sp.set("year", p.year);
  if (p.month) sp.set("month", p.month);
  if (p.group) sp.set("group", "month");
  if (!p.group && p.sort) {
    sp.set("sort", p.sort);
    sp.set("dir", p.dir);
  }
  if (value !== DEFAULT_PER) sp.set("per", value);
  const qs = sp.toString();
  return qs ? `/documents?${qs}` : "/documents";
}

// Link that changes only the page number, preserving filters/sort/page-size.
function pageHref(target: number, p: ListParams): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.cat) sp.set("cat", p.cat);
  if (p.cc) sp.set("cc", p.cc);
  if (p.year) sp.set("year", p.year);
  if (p.month) sp.set("month", p.month);
  if (p.group) sp.set("group", "month");
  if (!p.group && p.sort) {
    sp.set("sort", p.sort);
    sp.set("dir", p.dir);
  }
  if (p.per !== DEFAULT_PER) sp.set("per", p.per);
  if (target > 1) sp.set("page", String(target));
  const qs = sp.toString();
  return qs ? `/documents?${qs}` : "/documents";
}

// A pagination button: a real link, or a muted span when disabled.
function PageBtn({
  href,
  label,
  disabled,
}: {
  href: string;
  label: string;
  disabled: boolean;
}) {
  const base =
    "inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md border px-2";
  return disabled ? (
    <span className={`${base} border-slate-200 text-slate-300`}>{label}</span>
  ) : (
    <Link
      href={href}
      className={`${base} border-slate-300 text-slate-600 hover:bg-slate-50`}
    >
      {label}
    </Link>
  );
}

function SortTh({
  col,
  label,
  params,
  disabled = false,
  align = "left",
}: {
  col: SortKey;
  label: string;
  params: ListParams;
  disabled?: boolean;
  align?: "left" | "right";
}) {
  const cls = `px-4 py-3 font-medium ${align === "right" ? "text-right" : ""}`;
  if (disabled) {
    return <th className={cls}>{label}</th>;
  }
  const active = params.sort === col;
  const arrow = !active ? "↕" : params.dir === "asc" ? "▲" : "▼";
  return (
    <th className={cls}>
      <Link
        href={sortHref(col, params)}
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

// One document row, reused by the flat and the month-grouped rendering.
function DocumentRow({ d, query }: { d: DocRow; query: string }) {
  return (
    <tr className="align-top hover:bg-slate-50">
      <td className="px-4 py-3">
        <Link
          href={`/documents/${d.id}`}
          className="font-medium text-brand-700 hover:underline"
        >
          {query && d.titleHL ? (
            <span dangerouslySetInnerHTML={{ __html: highlight(d.titleHL) }} />
          ) : (
            d.title
          )}
        </Link>
        {query && d.snippet ? (
          <p
            className="mt-1 text-xs text-slate-500"
            dangerouslySetInnerHTML={{ __html: highlight(d.snippet) }}
          />
        ) : null}
      </td>
      <td className="px-4 py-3 text-slate-600">{d.categoryName ?? "—"}</td>
      <td className="px-4 py-3 text-slate-600">
        {d.costCenterName
          ? d.costCenterCode
            ? `${d.costCenterCode} · ${d.costCenterName}`
            : d.costCenterName
          : "—"}
      </td>
      <td className="px-4 py-3 text-slate-600">{d.partner ?? "—"}</td>
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
  );
}

type PeriodGroup = {
  key: string;
  year: number;
  month: number;
  rows: DocRow[];
  count: number;
};

// Bucket the (already date-ordered) rows into consecutive year+month groups.
function groupByPeriod(rows: DocRow[]): PeriodGroup[] {
  const groups: PeriodGroup[] = [];
  for (const r of rows) {
    const key = `${r.periodYear}-${r.periodMonth}`;
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = {
        key,
        year: r.periodYear,
        month: r.periodMonth,
        rows: [],
        count: 0,
      };
      groups.push(g);
    }
    g.rows.push(r);
    g.count += 1;
  }
  return groups;
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    cat?: string;
    cc?: string;
    year?: string;
    month?: string;
    group?: string;
    sort?: string;
    dir?: string;
    per?: string;
    page?: string;
  }>;
}) {
  const ctx = await getTenantContext();
  const sp = await searchParams;
  const query = sp.q?.trim() ?? "";
  const categoryId = sp.cat || undefined;
  const costCenterId = sp.cc || undefined;
  const yearNum = Number(sp.year) || undefined;
  const monthRaw = Number(sp.month);
  const monthNum =
    Number.isInteger(monthRaw) && monthRaw >= 1 && monthRaw <= 12
      ? monthRaw
      : undefined;
  const grouping = sp.group === "month";
  // While grouping, ordering is forced to the document period (newest first by
  // default) so consecutive rows share a month; column sorting is disabled.
  const sort = grouping ? "date" : sp.sort ?? "";
  const dir: "asc" | "desc" =
    sp.dir === "asc" ? "asc" : sp.dir === "desc" ? "desc" : grouping ? "desc" : "asc";

  const per = (PER_OPTIONS as readonly string[]).includes(sp.per ?? "")
    ? (sp.per as string)
    : DEFAULT_PER;
  const pageSize = Number(per);

  const filter = {
    tenantId: ctx.tenantId,
    q: query,
    categoryId,
    costCenterId,
    year: yearNum,
    month: monthNum,
  };

  // Totals (across all matches) first, so we can clamp the page before fetching.
  const [totals, categories, costCenters, years] = await Promise.all([
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
    listDocumentYears(ctx.tenantId),
  ]);

  const totalPages = Math.max(1, Math.ceil(totals.count / pageSize));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), totalPages);
  const rows = await findDocuments({
    ...filter,
    sort,
    dir,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const cat = sp.cat ?? "";
  const cc = sp.cc ?? "";
  const yearStr = yearNum ? String(yearNum) : "";
  const monthStr = monthNum ? String(monthNum) : "";
  const params: ListParams = {
    sort,
    dir,
    q: query,
    cat,
    cc,
    year: yearStr,
    month: monthStr,
    group: grouping,
    per,
    page,
  };

  const filtering =
    query.length > 0 ||
    !!categoryId ||
    !!costCenterId ||
    !!yearNum ||
    !!monthNum;
  const noun =
    totals.count === 1
      ? filtering
        ? "rezultat"
        : "dokument"
      : filtering
        ? "rezultata"
        : "dokumenata";

  const exportParams = new URLSearchParams();
  if (query) exportParams.set("q", query);
  if (cat) exportParams.set("cat", cat);
  if (cc) exportParams.set("cc", cc);
  if (yearStr) exportParams.set("year", yearStr);
  if (monthStr) exportParams.set("month", monthStr);
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
        {per !== DEFAULT_PER ? (
          <input type="hidden" name="per" value={per} />
        ) : null}
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
        <div>
          <label className="label" htmlFor="year">
            Godina
          </label>
          <select id="year" name="year" defaultValue={yearStr} className="input">
            <option value="">Sve godine</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="month">
            Mjesec
          </label>
          <select id="month" name="month" defaultValue={monthStr} className="input">
            <option value="">Svi mjeseci</option>
            {MONTHS_HR.map((name, i) => (
              <option key={i} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-600">
          <input
            type="checkbox"
            name="group"
            value="month"
            defaultChecked={grouping}
            className="h-4 w-4 rounded border-slate-300"
          />
          Grupiraj po mjesecu
        </label>
        <button type="submit" className="btn-primary">
          Traži
        </button>
        {filtering || grouping ? (
          <Link href="/documents" className="btn-ghost">
            Očisti
          </Link>
        ) : null}
      </form>

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
        <div className="flex flex-col gap-3">
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <SortTh col="title" label="Naziv" params={params} disabled={grouping} />
                <SortTh col="category" label="Kategorija" params={params} disabled={grouping} />
                <SortTh col="costcenter" label="Troškovni centar" params={params} disabled={grouping} />
                <SortTh col="partner" label="Partner" params={params} disabled={grouping} />
                <SortTh col="amount" label="Iznos" params={params} disabled={grouping} align="right" />
                <SortTh col="date" label="Datum" params={params} />
                <SortTh col="status" label="Status" params={params} disabled={grouping} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grouping
                ? groupByPeriod(rows).map((g) => (
                    <Fragment key={g.key}>
                      <tr className="bg-slate-100/70">
                        <td
                          colSpan={COLS}
                          className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600"
                        >
                          {formatMonthYear(g.year, g.month)}
                          <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">
                            · {g.count}
                          </span>
                        </td>
                      </tr>
                      {g.rows.map((d) => (
                        <DocumentRow key={d.id} d={d} query={query} />
                      ))}
                    </Fragment>
                  ))
                : rows.map((d) => (
                    <DocumentRow key={d.id} d={d} query={query} />
                  ))}
            </tbody>
          </table>
        </div>
        <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <span>Prikaži po:</span>
            {PER_OPTIONS.map((opt) =>
              per === opt ? (
                <span key={opt} className="font-semibold text-slate-700">
                  {opt}
                </span>
              ) : (
                <Link
                  key={opt}
                  href={perHref(opt, params)}
                  className="hover:text-slate-700 hover:underline"
                >
                  {opt}
                </Link>
              ),
            )}
          </div>
          <div>
            Ukupno:{" "}
            <span className="font-semibold text-slate-700">{totals.count}</span>{" "}
            {noun}
          </div>
          <div className="flex items-center gap-1">
            <PageBtn href={pageHref(1, params)} label="«" disabled={page <= 1} />
            <PageBtn href={pageHref(page - 1, params)} label="‹" disabled={page <= 1} />
            <span className="px-2 text-slate-600">
              {page} / {totalPages}
            </span>
            <PageBtn
              href={pageHref(page + 1, params)}
              label="›"
              disabled={page >= totalPages}
            />
            <PageBtn
              href={pageHref(totalPages, params)}
              label="»"
              disabled={page >= totalPages}
            />
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
