import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const VALID_STATUSES = ['active', 'ready_to_invoice', 'invoiced', 'paid']

export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { client, siteAddress, status } = body

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const updated = await prisma.projectName.update({
    where: { id: parseInt(id) },
    data: {
      ...(client !== undefined ? { client: client || null } : {}),
      ...(siteAddress !== undefined ? { siteAddress: siteAddress || null } : {}),
      ...(status !== undefined ? { status } : {}),
    },
  })

  return NextResponse.json(updated)
}
