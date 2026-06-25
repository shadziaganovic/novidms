import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// Tenant-scoped document listing + full-text search + column sorting.
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
  documentDate: Date | null;
  ocrStatus: string;
  sizeBytes: number;
  createdAt: Date;
  categoryName: string | null;
  snippet: string | null;
}

export type SortKey =
  | "title"
  | "category"
  | "partner"
  | "date"
  | "size"
  | "status";

const HEADLINE_OPTS =
  "StartSel=[[HL]],StopSel=[[/HL]],MaxFragments=2,MinWords=4,MaxWords=16,FragmentDelimiter= … ";

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
    case "partner":
      return Prisma.sql`lower(d.partner) ${dir} NULLS LAST, ${tie}`;
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

export async function findDocuments(opts: {
  tenantId: string;
  q?: string;
  categoryId?: string;
  sort?: string;
  dir?: string;
}): Promise<DocRow[]> {
  const { tenantId } = opts;
  const q = opts.q?.trim();
  const categoryClause = opts.categoryId
    ? Prisma.sql`AND d."categoryId" = ${opts.categoryId}`
    : Prisma.empty;
  const order = sortOrder(opts.sort, opts.dir);

  if (q) {
    const orderBy =
      order ??
      Prisma.sql`ts_rank(d."searchVector", plainto_tsquery('simple', ${q})) DESC, d."createdAt" DESC`;
    return prisma.$queryRaw<DocRow[]>`
      SELECT d.id, d.title,
             ts_headline('simple', d.title, plainto_tsquery('simple', ${q}),
               'StartSel=[[HL]],StopSel=[[/HL]],HighlightAll=true') AS "titleHL",
             d.partner, d."documentDate", d."ocrStatus"::text AS "ocrStatus",
             d."sizeBytes", d."createdAt", c.name AS "categoryName",
             ts_headline('simple',
               coalesce(d."ocrText", '') || ' ' || coalesce(d."description", ''),
               plainto_tsquery('simple', ${q}), ${HEADLINE_OPTS}) AS snippet
      FROM "Document" d
      LEFT JOIN "Category" c ON c.id = d."categoryId"
      WHERE d."tenantId" = ${tenantId}
        AND d."searchVector" @@ plainto_tsquery('simple', ${q})
        ${categoryClause}
      ORDER BY ${orderBy}
      LIMIT 100`;
  }

  const orderBy = order ?? Prisma.sql`d."createdAt" DESC`;
  return prisma.$queryRaw<DocRow[]>`
    SELECT d.id, d.title, NULL::text AS "titleHL", d.partner, d."documentDate",
           d."ocrStatus"::text AS "ocrStatus", d."sizeBytes", d."createdAt",
           c.name AS "categoryName", NULL::text AS snippet
    FROM "Document" d
    LEFT JOIN "Category" c ON c.id = d."categoryId"
    WHERE d."tenantId" = ${tenantId} ${categoryClause}
    ORDER BY ${orderBy}
    LIMIT 100`;
}
