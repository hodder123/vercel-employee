import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// TEMPORARY. Read-only. Remove after use.
const SECRET = 'd92f6a1e3c8b5091f74ad620e8c3b9f15a27d4e6'

const NAMES = [
  '1927 sunny crest', '1927 sunnycrest',
  '861 palmer', 'Palmer 861',
  'Tumrun Dalia', 'tamrun dailia',
  'Laurie Bradley', 'Lourie Bradley',
  'canadian western bank', '101-1211 Summit Dr',
  "Irwin’s bakery", 'Erwins',
]

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await prisma.workHour.findMany({
    where: {
      OR: NAMES.map((n) => ({ projects: { contains: n } })),
    },
    select: { id: true, employeeId: true, date: true, projects: true, hoursWorked: true },
    orderBy: { id: 'asc' },
  })

  return NextResponse.json({ ok: true, count: rows.length, rows })
}
