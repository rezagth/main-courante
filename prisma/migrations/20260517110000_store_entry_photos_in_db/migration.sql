-- Persist entry photos directly in PostgreSQL
ALTER TABLE "entrees_main_courante"
ADD COLUMN "photo_data" BYTEA,
ADD COLUMN "photo_mime_type" TEXT,
ADD COLUMN "photo_size_bytes" INTEGER;
