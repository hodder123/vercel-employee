import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// TEMPORARY. Read-only. Remove after use.
const SECRET = 'e7d41a9f6c3b0582e9d4a7f1c6b0e3a9d5f2c8b1'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const jobs = await prisma.projectName.findMany({
    select: { id: true, name: true, clientId: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ ok: true, count: jobs.length, jobs })
}
