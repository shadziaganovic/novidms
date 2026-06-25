import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// Tenant-scoped document listing + full-text search.
//
// Search uses the generated `searchVector` (tsvector over title + ocrText +
// partner) with plainto_tsquery, ranks by ts_rank, and produces highlighted
// snippets with ts_headline. Highlight markers are plain-ASCII sentinels
// ([[HL]] / [[/HL]]) so the rendering layer can HTML-escape the text first and
// only then inject <mark> — preventing XSS from document contents.

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

const HEADLINE_OPTS =
  "StartSel=[[HL]],StopSel=[[/HL]],MaxFragments=2,MinWords=4,MaxWords=16,FragmentDelimiter= … ";

export async function findDocuments(opts: {
  tenantId: string;
  q?: string;
  categoryId?: string;
}): Promise<DocRow[]> {
  const { tenantId } = opts;
  const q = opts.q?.trim();
  const categoryClause = opts.categoryId
    ? Prisma.sql`AND d."categoryId" = ${opts.categoryId}`
    : Prisma.empty;

  if (q) {
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
      ORDER BY ts_rank(d."searchVector", plainto_tsquery('simple', ${q})) DESC,
               d."createdAt" DESC
      LIMIT 100`;
  }

  return prisma.$queryRaw<DocRow[]>`
    SELECT d.id, d.title, NULL::text AS "titleHL", d.partner, d."documentDate",
           d."ocrStatus"::text AS "ocrStatus", d."sizeBytes", d."createdAt",
           c.name AS "categoryName", NULL::text AS snippet
    FROM "Document" d
    LEFT JOIN "Category" c ON c.id = d."categoryId"
    WHERE d."tenantId" = ${tenantId} ${categoryClause}
    ORDER BY d."createdAt" DESC
    LIMIT 100`;
}
