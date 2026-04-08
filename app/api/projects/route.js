import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET — fetch all project names (any logged-in user)
export async function GET(request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await prisma.projectName.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })
  return NextResponse.json(projects)
}

// POST — add a new project name (any logged-in user)
export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json()
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const trimmed = name.trim().slice(0, 100)

  // upsert so duplicates are silently ignored
  const project = await prisma.projectName.upsert({
    where: { name: trimmed },
    update: {},
    create: { name: trimmed },
  })
  return NextResponse.json(project)
}

// DELETE — remove a project name (admin only)
export async function DELETE(request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

  await prisma.projectName.delete({ where: { id: Number(id) } })
  return NextResponse.json({ success: true })
}
