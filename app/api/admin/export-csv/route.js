import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { DateTime } from 'luxon'

const TZ = 'America/Los_Angeles'

function parseProjects(val) {
  try {
    if (typeof val === 'string') return JSON.parse(val)
    return val || []
  } catch {
    return []
  }
}

function escapeCsv(val) {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(...cells) {
  return cells.map(escapeCsv).join(',') + '\r\n'
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    const employeeId = searchParams.get('employeeId') // optional filter

    // Build date filter
    let dateFilter = {}
    if (startDate) {
      const start = DateTime.fromISO(startDate, { zone: TZ }).startOf('day').toJSDate()
      const end = endDate
        ? DateTime.fromISO(endDate, { zone: TZ }).endOf('day').toJSDate()
        : DateTime.now().setZone(TZ).endOf('day').toJSDate()
      dateFilter = { gte: start, lte: end }
    }

    const where = {
      ...(employeeId ? { employeeId } : { employee: { id: { not: '0' } } }),
      ...(startDate ? { date: dateFilter } : {}),
    }

    const workHours = await prisma.workHour.findMany({
      where,
      orderBy: [{ employee: { fullName: 'asc' } }, { date: 'asc' }],
      include: { employee: { select: { id: true, name: true, fullName: true } } }
    })

    // Build CSV
    let csv = row(
      'Employee', 'Date', 'Day',
      'Project', 'Project Hours', 'Project Location', 'Project Description',
      'Total Hours', 'Entry Location', 'Latitude', 'Longitude',
      'Signature', 'Logged At'
    )

    for (const entry of workHours) {
      const empName = entry.employee?.fullName || entry.employee?.name || 'Unknown'
      const entryDate = DateTime.fromJSDate(entry.date).setZone(TZ)
      const dateStr = entryDate.toFormat('yyyy-MM-dd')
      const dayStr = entryDate.toFormat('EEEE')
      const loggedAt = DateTime.fromJSDate(entry.createdAt).setZone(TZ).toFormat('yyyy-MM-dd HH:mm')
      const sig = entry.signature && entry.signature !== 'admin-added' && entry.signature.startsWith('data:')
        ? 'Signed'
        : entry.signature === 'admin-added'
        ? 'Admin Added'
        : 'None'

      const projects = parseProjects(entry.projects)

      if (projects.length === 0) {
        csv += row(
          empName, dateStr, dayStr,
          '', '', '', '',
          entry.hoursWorked,
          entry.locationName || '',
          entry.latitude || '', entry.longitude || '',
          sig, loggedAt
        )
      } else {
        for (const proj of projects) {
          csv += row(
            empName, dateStr, dayStr,
            proj.name || '', proj.hours || '', proj.location || '', proj.description || '',
            entry.hoursWorked,
            entry.locationName || '',
            entry.latitude || '', entry.longitude || '',
            sig, loggedAt
          )
        }
      }
    }

    const filename = startDate && endDate
      ? `timesheet_${startDate}_to_${endDate}.csv`
      : `timesheet_export_${DateTime.now().setZone(TZ).toFormat('yyyy-MM-dd')}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('CSV export error:', error)
    return NextResponse.json({ error: 'Export failed: ' + error.message }, { status: 500 })
  }
}
