import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

async function validate(body) {
  const data = {}
  if (body.message !== undefined) {
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!message) return { error: 'Message is required' }
    if (message.length > 1000) return { error: 'Message must be 1000 characters or fewer' }
    data.message = message
  }
  if (body.active !== undefined) data.active = Boolean(body.active)
  if (body.allEmployees !== undefined || body.employeeIds !== undefined) {
    const allEmployees = Boolean(body.allEmployees)
    let employeeIds = Array.isArray(body.employeeIds) ? body.employeeIds.filter((x) => typeof x === 'string') : []
    if (!allEmployees) {
      if (employeeIds.length === 0) return { error: 'Pick at least one employee, or choose Everyone' }
      const found = await prisma.employee.findMany({ where: { id: { in: employeeIds } }, select: { id: true } })
      employeeIds = found.map((e) => e.id)
      if (employeeIds.length === 0) return { error: 'No matching employees found' }
    } else {
      employeeIds = []
    }
    data.allEmployees = allEmployees
    data.employeeIds = employeeIds
  }
  return { data }
}

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  return session && session.user.role === 'admin'
}

export async function PUT(request, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const { data, error } = await validate(body)
  if (error) return NextResponse.json({ error }, { status: 400 })
  try {
    const notice = await prisma.notice.update({ where: { id: parseInt(id) }, data })
    return NextResponse.json(notice)
  } catch (e) {
    return NextResponse.json({ error: 'Notice not found' }, { status: 404 })
  }
}

export async function DELETE(request, { params }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  try {
    await prisma.notice.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Notice not found' }, { status: 404 })
  }
}
