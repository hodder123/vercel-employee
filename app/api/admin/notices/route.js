import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const MAX_MESSAGE = 1000

async function validateNoticeBody(body, { partial = false } = {}) {
  const data = {}

  if (body.message !== undefined || !partial) {
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!message) return { error: 'Message is required' }
    if (message.length > MAX_MESSAGE) return { error: `Message must be ${MAX_MESSAGE} characters or fewer` }
    data.message = message
  }

  if (body.active !== undefined) data.active = Boolean(body.active)

  if (body.allEmployees !== undefined || body.employeeIds !== undefined || !partial) {
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

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const notices = await prisma.notice.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(notices)
}

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { data, error } = await validateNoticeBody(body)
  if (error) return NextResponse.json({ error }, { status: 400 })

  const notice = await prisma.notice.create({ data })
  return NextResponse.json(notice)
}
