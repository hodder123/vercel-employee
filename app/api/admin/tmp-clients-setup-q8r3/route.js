import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// TEMPORARY. Remove after use.
const SECRET = '22f7a1462f38c1b6c0498273bb32d8e5d649e65fe886db27'

const SQL = `
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
`

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const statements = SQL.split(';').map((s) => s.trim()).filter(Boolean)
    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt)
    }

    const jobs = await prisma.projectName.findMany({
      select: { id: true, name: true, client: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ ok: true, jobCount: jobs.length, jobs })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
