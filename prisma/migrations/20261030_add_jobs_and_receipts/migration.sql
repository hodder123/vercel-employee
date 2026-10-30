ALTER TABLE "project_names"
  ADD COLUMN IF NOT EXISTS "client" TEXT,
  ADD COLUMN IF NOT EXISTS "site_address" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "receipts" (
  "id" SERIAL PRIMARY KEY,
  "project_id" INTEGER NOT NULL REFERENCES "project_names"("id"),
  "vendor" TEXT,
  "amount" DOUBLE PRECISION,
  "date" TIMESTAMP(3),
  "file_url" TEXT NOT NULL,
  "file_type" TEXT,
  "file_name" TEXT,
  "uploaded_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "receipts_project_id_idx" ON "receipts"("project_id");
