import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { del } from '@vercel/blob'

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const receipt = await prisma.receipt.findUnique({ where: { id: parseInt(id) } })
  if (!receipt) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
  }

  try {
    await del(receipt.fileUrl)
  } catch (err) {
    console.error('Blob delete error (continuing):', err.message)
  }

  await prisma.receipt.delete({ where: { id: parseInt(id) } })

  return NextResponse.json({ success: true })
}
