-- Include the document description in the full-text search vector.
--
-- Postgres 16 cannot alter a generated column's expression in place, so we drop
-- and recreate the column (and its GIN index). STORED means every existing row
-- is recomputed, so descriptions become searchable immediately.

DROP INDEX IF EXISTS "Document_searchVector_idx";

ALTER TABLE "Document" DROP COLUMN "searchVector";

ALTER TABLE "Document"
  ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce("title", '') || ' ' ||
      coalesce("ocrText", '') || ' ' ||
      coalesce("partner", '') || ' ' ||
      coalesce("description", '')
    )
  ) STORED;

CREATE INDEX "Document_searchVector_idx" ON "Document" USING GIN ("searchVector");
