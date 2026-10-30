import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// TEMPORARY one-time migration runner. Remove after use.
const ONE_TIME_SECRET = 'd121c28ccf259380ad5a44a3c138491d6bc5ca0e5bb57cb3'

const SQL = `
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
`

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== ONE_TIME_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const statements = SQL.split(';').map(s => s.trim()).filter(Boolean)
    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt)
    }
    const cols1 = await prisma.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'project_names' ORDER BY ordinal_position`
    )
    const cols2 = await prisma.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'receipts' ORDER BY ordinal_position`
    )
    return NextResponse.json({ ok: true, project_names_columns: cols1, receipts_columns: cols2 })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
