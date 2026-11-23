import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('key') !== '38ddd7ca572f2892453e27a5') return NextResponse.json({ error: 'no' }, { status: 403 })
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "notices" (
    "id" SERIAL PRIMARY KEY,
    "message" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "all_employees" BOOLEAN NOT NULL DEFAULT false,
    "employee_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`)
  const n = await prisma.notice.count()
  return NextResponse.json({ ok: true, count: n })
}
