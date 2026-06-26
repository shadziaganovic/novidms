import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// Tenant-scoped document listing + full-text search + filters + sorting + sums.
//
// Search uses the generated `searchVector` (tsvector over title + ocrText +
// partner + description) with plainto_tsquery, ranks by ts_rank, and produces
// highlighted snippets with ts_headline. Highlight markers are plain-ASCII
// sentinels ([[HL]] / [[/HL]]) so the rendering layer can HTML-escape the text
// first and only then inject <mark> — preventing XSS from document contents.

export interface DocRow {
  id: string;
  title: string;
  titleHL: string | null;
  partner: string | null;
  amount: number | null;
  documentDate: Date | null;
  ocrStatus: string;
  sizeBytes: number;
  createdAt: Date;
  categoryName: string | null;
  costCenterName: string | null;
  costCenterCode: string | null;
  snippet: string | null;
}

export type SortKey =
  | "title"
  | "category"
  | "costcenter"
  | "partner"
  | "amount"
  | "date"
  | "size"
  | "status";

export interface DocFilter {
  tenantId: string;
  q?: string;
  categoryId?: string;
  costCenterId?: string;
}

const HEADLINE_OPTS =
  "StartSel=[[HL]],StopSel=[[/HL]],MaxFragments=2,MinWords=4,MaxWords=16,FragmentDelimiter= … ";

// Shared WHERE (only references Document columns), so the list and the sum stay
// in sync. Tenant id is always applied first.
function buildWhere(f: DocFilter): Prisma.Sql {
  const q = f.q?.trim();
  return Prisma.sql`d."tenantId" = ${f.tenantId}
    ${q ? Prisma.sql`AND d."searchVector" @@ plainto_tsquery('simple', ${q})` : Prisma.empty}
    ${f.categoryId ? Prisma.sql`AND d."categoryId" = ${f.categoryId}` : Prisma.empty}
    ${f.costCenterId ? Prisma.sql`AND d."costCenterId" = ${f.costCenterId}` : Prisma.empty}`;
}

// Whitelisted ORDER BY fragments (no user input is interpolated as SQL). Returns
// null when no/invalid sort is given, so the caller can apply its own default.
function sortOrder(sort?: string, dirIn?: string): Prisma.Sql | null {
  const dir = dirIn === "desc" ? Prisma.sql`DESC` : Prisma.sql`ASC`;
  const tie = Prisma.sql`d."createdAt" DESC`;
  switch (sort) {
    case "title":
      return Prisma.sql`lower(d.title) ${dir}, ${tie}`;
    case "category":
      return Prisma.sql`lower(c.name) ${dir} NULLS LAST, ${tie}`;
    case "costcenter":
      return Prisma.sql`lower(cc.name) ${dir} NULLS LAST, ${tie}`;
    case "partner":
      return Prisma.sql`lower(d.partner) ${dir} NULLS LAST, ${tie}`;
    case "amount":
      return Prisma.sql`d.amount ${dir} NULLS LAST, ${tie}`;
    case "date":
      return Prisma.sql`COALESCE(d."documentDate", d."createdAt") ${dir}, ${tie}`;
    case "size":
      return Prisma.sql`d."sizeBytes" ${dir}, ${tie}`;
    case "status":
      return Prisma.sql`d."ocrStatus"::text ${dir}, ${tie}`;
    default:
      return null;
  }
}

export async function findDocuments(
  opts: DocFilter & { sort?: string; dir?: string },
): Promise<DocRow[]> {
  const q = opts.q?.trim();
  const where = buildWhere(opts);
  const order = sortOrder(opts.sort, opts.dir);

  if (q) {
    const orderBy =
      order ??
      Prisma.sql`ts_rank(d."searchVector", plainto_tsquery('simple', ${q})) DESC, d."createdAt" DESC`;
    return prisma.$queryRaw<DocRow[]>`
      SELECT d.id, d.title,
             ts_headline('simple', d.title, plainto_tsquery('simple', ${q}),
               'StartSel=[[HL]],StopSel=[[/HL]],HighlightAll=true') AS "titleHL",
             d.partner, d."amount"::float8 AS amount, d."documentDate",
             d."ocrStatus"::text AS "ocrStatus", d."sizeBytes", d."createdAt",
             c.name AS "categoryName",
             cc.name AS "costCenterName", cc.code AS "costCenterCode",
             ts_headline('simple',
               coalesce(d."ocrText", '') || ' ' || coalesce(d."description", ''),
               plainto_tsquery('simple', ${q}), ${HEADLINE_OPTS}) AS snippet
      FROM "Document" d
      LEFT JOIN "Category" c ON c.id = d."categoryId"
      LEFT JOIN "CostCenter" cc ON cc.id = d."costCenterId"
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT 100`;
  }

  const orderBy = order ?? Prisma.sql`d."createdAt" DESC`;
  return prisma.$queryRaw<DocRow[]>`
    SELECT d.id, d.title, NULL::text AS "titleHL", d.partner,
           d."amount"::float8 AS amount, d."documentDate",
           d."ocrStatus"::text AS "ocrStatus", d."sizeBytes", d."createdAt",
           c.name AS "categoryName", cc.name AS "costCenterName",
           cc.code AS "costCenterCode", NULL::text AS snippet
    FROM "Document" d
    LEFT JOIN "Category" c ON c.id = d."categoryId"
    LEFT JOIN "CostCenter" cc ON cc.id = d."costCenterId"
    WHERE ${where}
    ORDER BY ${orderBy}
    LIMIT 100`;
}

/** Total amount + document count for the same filter (across ALL matches). */
export async function sumDocuments(
  opts: DocFilter,
): Promise<{ total: number; count: number }> {
  const where = buildWhere(opts);
  const rows = await prisma.$queryRaw<{ total: number; count: number }[]>`
    SELECT COALESCE(SUM(d.amount), 0)::float8 AS total, COUNT(*)::int AS count
    FROM "Document" d
    WHERE ${where}`;
  return rows[0] ?? { total: 0, count: 0 };
}
