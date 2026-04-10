import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import ExcelJS from 'exceljs'

const TZ = 'America/Los_Angeles'

function parseProjects(val) {
  try {
    if (typeof val === 'string') return JSON.parse(val)
    return val || []
  } catch {
    return []
  }
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

    let dateFilter = {}
    if (startDate) {
      const start = DateTime.fromISO(startDate, { zone: TZ }).startOf('day').toJSDate()
      const end = endDate
        ? DateTime.fromISO(endDate, { zone: TZ }).endOf('day').toJSDate()
        : DateTime.now().setZone(TZ).endOf('day').toJSDate()
      dateFilter = { gte: start, lte: end }
    }

    const workHours = await prisma.workHour.findMany({
      where: {
        employee: { id: { not: '0' } },
        ...(startDate ? { date: dateFilter } : {}),
      },
      orderBy: [{ date: 'asc' }],
      include: { employee: { select: { name: true, fullName: true } } }
    })

    // ── Build flat rows ───────────────────────────────────────────────────────
    const rows = []
    for (const entry of workHours) {
      const projects = parseProjects(entry.projects)
      const empName = entry.employee?.fullName || entry.employee?.name || 'Unknown'
      const dateStr = DateTime.fromJSDate(entry.date).setZone(TZ).toFormat('yyyy-MM-dd')

      if (projects.length === 0) {
        rows.push({
          project: 'Unassigned',
          name: empName,
          description: '',
          date: dateStr,
          hours: parseFloat(entry.hoursWorked) || 0,
          location: '',
        })
      } else {
        for (const proj of projects) {
          rows.push({
            project: proj.name || 'Unassigned',
            name: empName,
            description: proj.description || '',
            date: dateStr,
            hours: parseFloat(proj.hours) || 0,
            location: proj.location || '',
          })
        }
      }
    }

    // Sort by project, then date, then name
    rows.sort((a, b) =>
      a.project.localeCompare(b.project) ||
      a.date.localeCompare(b.date) ||
      a.name.localeCompare(b.name)
    )

    // ── Build Excel ───────────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Hodder Construction'
    workbook.created = new Date()

    const sheet = workbook.addWorksheet('Billing', {
      views: [{ state: 'frozen', ySplit: 1 }],
    })

    sheet.columns = [
      { key: 'project',     width: 28 },
      { key: 'name',        width: 22 },
      { key: 'description', width: 36 },
      { key: 'date',        width: 14 },
      { key: 'hours',       width: 10 },
      { key: 'location',    width: 24 },
    ]

    const BLUE_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
    const WHITE_FONT = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 }
    const BORDER = {
      top:    { style: 'thin', color: { argb: 'FFBDD7EE' } },
      bottom: { style: 'thin', color: { argb: 'FFBDD7EE' } },
      left:   { style: 'thin', color: { argb: 'FFBDD7EE' } },
      right:  { style: 'thin', color: { argb: 'FFBDD7EE' } },
    }
    const ALT_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F6FC' } }

    // Header
    const header = sheet.addRow(['PROJECT', 'EMPLOYEE', 'DESCRIPTION', 'DATE', 'HOURS', 'LOCATION'])
    header.height = 22
    header.eachCell(cell => {
      cell.fill = BLUE_FILL
      cell.font = WHITE_FONT
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = BORDER
    })

    // Data rows
    rows.forEach((r, i) => {
      const row = sheet.addRow([r.project, r.name, r.description, r.date, r.hours, r.location])
      row.height = 18
      row.eachCell((cell, col) => {
        cell.border = BORDER
        cell.alignment = { vertical: 'middle' }
        if (i % 2 === 1) cell.fill = ALT_FILL
        if (col === 5) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
          cell.numFmt = '0.##'
        }
      })
    })

    // Auto-filter on header row
    sheet.autoFilter = { from: 'A1', to: 'F1' }

    const buffer = await workbook.xlsx.writeBuffer()
    const filename = startDate && endDate
      ? `billing_${startDate}_to_${endDate}.xlsx`
      : `billing_export_${DateTime.now().setZone(TZ).toFormat('yyyy-MM-dd')}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Billing export error:', error)
    return NextResponse.json({ error: 'Export failed: ' + error.message }, { status: 500 })
  }
}
