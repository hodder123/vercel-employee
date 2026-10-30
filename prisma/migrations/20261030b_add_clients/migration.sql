CREATE TABLE IF NOT EXISTS "clients" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "phone2" TEXT,
  "phone3" TEXT,
  "company" TEXT,
  "address" TEXT,
  "notes" TEXT,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "project_names"
  ADD COLUMN IF NOT EXISTS "client_id" INTEGER REFERENCES "clients"("id");

CREATE INDEX IF NOT EXISTS "project_names_client_id_idx" ON "project_names"("client_id");
