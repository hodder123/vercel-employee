import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { DateTime } from 'luxon'
import { buildReportRows, getCustomRange, getDefaultWeeklyRange, REPORT_TIMEZONE } from '@/lib/reporting'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startDate, endDate } = body || {}

    let range
    let cutoffTime

    if (startDate && endDate) {
      const custom = getCustomRange({ startDate, endDate })
      range = { start: custom.start, end: custom.end }
      cutoffTime = custom.cutoffTime
    } else {
      const weekly = getDefaultWeeklyRange(DateTime.now().setZone(REPORT_TIMEZONE))
      range = { start: weekly.start, end: weekly.end }
      cutoffTime = weekly.cutoffTime
    }

    if (range.end < range.start) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    const workHours = await prisma.workHour.findMany({
      where: {
        date: {
          gte: range.start.toJSDate(),
          lte: range.end.toJSDate()
        },
        createdAt: {
          lte: cutoffTime.toJSDate()
        }
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            fullName: true
          }
        }
      },
      orderBy: [
        { employeeId: 'asc' },
        { date: 'asc' }
      ]
    })

    const rows = buildReportRows(workHours)
    const totalHours = workHours.reduce((sum, entry) => sum + entry.hoursWorked, 0)
    const employees = new Set(workHours.map((entry) => entry.employeeId))

    return NextResponse.json({
      success: true,
      range: {
        startDate: range.start.toISODate(),
        endDate: range.end.toISODate(),
        cutoff: cutoffTime.toISO()
      },
      totals: {
        entries: workHours.length,
        hours: Math.round(totalHours * 10) / 10,
        employees: employees.size
      },
      rows
    })
  } catch (error) {
    console.error('Report preview error:', error)
    return NextResponse.json({ error: 'Failed to build preview' }, { status: 500 })
  }
}
