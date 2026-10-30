import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// TEMPORARY. Read-only. Remove after use.
const SECRET = 'f1a3c8e05b9d2a7f4e61c0b8d9f2a5e7c3b1d6a4f8'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobs = await prisma.projectName.findMany({
    select: {
      id: true,
      name: true,
      client: true,
      siteAddress: true,
      status: true,
      clientId: true,
      clientRecord: { select: { id: true, name: true, address: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ ok: true, count: jobs.length, jobs })
}
