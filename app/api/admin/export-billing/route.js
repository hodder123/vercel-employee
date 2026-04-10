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

    // Group by project name
    const projectMap = {}

    for (const entry of workHours) {
      const projects = parseProjects(entry.projects)
      const empName = entry.employee?.fullName || entry.employee?.name || 'Unknown'
      const dateStr = DateTime.fromJSDate(entry.date).setZone(TZ).toFormat('yyyy-MM-dd')

      if (projects.length === 0) {
        // No project breakdown — bucket under "Unassigned"
        const key = 'Unassigned'
        if (!projectMap[key]) projectMap[key] = []
        projectMap[key].push({
          employee: empName,
          date: dateStr,
          hours: parseFloat(entry.hoursWorked) || 0,
          location: '',
          description: '',
        })
      } else {
        for (const proj of projects) {
          const key = proj.name || 'Unassigned'
          if (!projectMap[key]) projectMap[key] = []
          projectMap[key].push({
            employee: empName,
            date: dateStr,
            hours: parseFloat(proj.hours) || 0,
            location: proj.location || '',
            description: proj.description || '',
          })
        }
      }
    }

    // ── Build Excel workbook ──────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Hodder Construction'
    workbook.created = new Date()

    // Colours
    const BLUE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
    const LIGHT_BLUE = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F0' } }
    const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } }
    const GRAND_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
    const WHITE_FONT = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 }
    const DARK_FONT = { color: { argb: 'FF1E3A5F' }, bold: true, size: 11 }
    const BORDER = {
      top: { style: 'thin', color: { argb: 'FFBDD7EE' } },
      bottom: { style: 'thin', color: { argb: 'FFBDD7EE' } },
      left: { style: 'thin', color: { argb: 'FFBDD7EE' } },
      right: { style: 'thin', color: { argb: 'FFBDD7EE' } },
    }

    // ── Sheet 1: By Project ───────────────────────────────────────────────────
    const sheet1 = workbook.addWorksheet('By Project', {
      views: [{ state: 'frozen', ySplit: 1 }],
    })

    sheet1.columns = [
      { key: 'project',     width: 28 },
      { key: 'employee',    width: 22 },
      { key: 'date',        width: 14 },
      { key: 'hours',       width: 10 },
      { key: 'location',    width: 20 },
      { key: 'description', width: 36 },
    ]

    // Header row
    const h1 = sheet1.addRow(['Project', 'Employee', 'Date', 'Hours', 'Location', 'Description'])
    h1.eachCell(cell => {
      cell.fill = BLUE_FILL
      cell.font = WHITE_FONT
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = BORDER
    })
    h1.height = 22

    let grandTotal = 0
    const sortedProjects = Object.keys(projectMap).sort()

    for (const projectName of sortedProjects) {
      const rows = projectMap[projectName]
      // Sort rows by date then employee
      rows.sort((a, b) => a.date.localeCompare(b.date) || a.employee.localeCompare(b.employee))

      // Project header
      const projRow = sheet1.addRow([projectName, '', '', '', '', ''])
      projRow.height = 20
      projRow.eachCell((cell, col) => {
        cell.fill = LIGHT_BLUE
        cell.font = DARK_FONT
        cell.border = BORDER
        if (col === 1) cell.alignment = { vertical: 'middle' }
      })

      let projectTotal = 0
      for (const r of rows) {
        const dataRow = sheet1.addRow(['', r.employee, r.date, r.hours, r.location, r.description])
        dataRow.height = 18
        dataRow.eachCell((cell, col) => {
          cell.border = BORDER
          cell.alignment = { vertical: 'middle' }
          if (col === 4) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' }
            cell.numFmt = '0.##'
          }
        })
        projectTotal += r.hours
      }

      // Project total row
      const totalRow = sheet1.addRow(['', '', 'Project Total', projectTotal, '', ''])
      totalRow.height = 20
      totalRow.eachCell((cell, col) => {
        cell.fill = TOTAL_FILL
        cell.font = { bold: true, size: 10, color: { argb: 'FF1E3A5F' } }
        cell.border = BORDER
        cell.alignment = { vertical: 'middle', horizontal: col === 3 ? 'right' : col === 4 ? 'center' : 'left' }
        if (col === 4) cell.numFmt = '0.##'
      })

      grandTotal += projectTotal

      // Spacer
      sheet1.addRow([])
    }

    // Grand total
    const grandRow = sheet1.addRow(['GRAND TOTAL', '', '', grandTotal, '', ''])
    grandRow.height = 24
    grandRow.eachCell((cell, col) => {
      cell.fill = GRAND_FILL
      cell.font = WHITE_FONT
      cell.border = BORDER
      cell.alignment = { vertical: 'middle', horizontal: col === 4 ? 'center' : 'left' }
      if (col === 4) cell.numFmt = '0.##'
    })

    // ── Sheet 2: Summary ──────────────────────────────────────────────────────
    const sheet2 = workbook.addWorksheet('Summary')

    const rangeLabel = startDate && endDate ? `${startDate} to ${endDate}` : 'All Time'
    sheet2.mergeCells('A1:D1')
    const titleCell = sheet2.getCell('A1')
    titleCell.value = `Billing Summary — ${rangeLabel}`
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' } }
    titleCell.alignment = { vertical: 'middle' }
    sheet2.getRow(1).height = 28

    sheet2.columns = [
      { key: 'project',  width: 30 },
      { key: 'hours',    width: 14 },
      { key: 'employees', width: 36 },
      { key: 'entries',  width: 12 },
    ]

    const h2 = sheet2.addRow(['Project', 'Total Hours', 'Employees', 'Entries'])
    h2.eachCell(cell => {
      cell.fill = BLUE_FILL
      cell.font = WHITE_FONT
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = BORDER
    })
    h2.height = 22

    let summaryGrand = 0
    for (const projectName of sortedProjects) {
      const rows = projectMap[projectName]
      const total = rows.reduce((s, r) => s + r.hours, 0)
      const employees = [...new Set(rows.map(r => r.employee))].sort().join(', ')
      const summaryRow = sheet2.addRow([projectName, total, employees, rows.length])
      summaryRow.height = 18
      summaryRow.eachCell((cell, col) => {
        cell.border = BORDER
        cell.alignment = { vertical: 'middle', horizontal: col === 2 || col === 4 ? 'center' : 'left' }
        if (col === 2) cell.numFmt = '0.##'
      })
      summaryGrand += total
    }

    // Summary grand total
    const sGrand = sheet2.addRow(['TOTAL', summaryGrand, '', ''])
    sGrand.height = 22
    sGrand.eachCell((cell, col) => {
      cell.fill = GRAND_FILL
      cell.font = WHITE_FONT
      cell.border = BORDER
      cell.alignment = { vertical: 'middle', horizontal: col === 2 ? 'center' : 'left' }
      if (col === 2) cell.numFmt = '0.##'
    })

    // ── Stream response ───────────────────────────────────────────────────────
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
