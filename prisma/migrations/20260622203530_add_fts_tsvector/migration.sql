-- Full-text search support for Document.
--
-- A STORED generated tsvector column over title + ocrText + partner, with a GIN
-- index. Uses the 'simple' configuration (no stemming, no stopwords) which suits
-- Croatian (Postgres ships no Croatian stemmer) and works for English too.
-- Column names are quoted because Prisma keeps them camelCase.

ALTER TABLE "Document"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce("title", '') || ' ' ||
      coalesce("ocrText", '') || ' ' ||
      coalesce("partner", '')
    )
  ) STORED;

CREATE INDEX "Document_searchVector_idx" ON "Document" USING GIN ("searchVector");
