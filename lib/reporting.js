import ExcelJS from 'exceljs'
import { DateTime } from 'luxon'

export const REPORT_TIMEZONE = 'America/Los_Angeles'

export function getDefaultWeeklyRange(now = DateTime.now().setZone(REPORT_TIMEZONE)) {
  const startOfThisWeek = now.startOf('week')
  const start = startOfThisWeek.minus({ weeks: 1 }).startOf('day')
  const end = startOfThisWeek.minus({ days: 1 }).endOf('day')
  const cutoffTime = end.set({ hour: 9, minute: 0, second: 0, millisecond: 0 })
  return { start, end, cutoffTime }
}

export function getCustomRange({ startDate, endDate, zone = REPORT_TIMEZONE }) {
  const start = DateTime.fromISO(startDate, { zone }).startOf('day')
  const end = DateTime.fromISO(endDate, { zone }).endOf('day')
  return { start, end, cutoffTime: end }
}

export function parseProjects(projects) {
  try {
    if (typeof projects === 'string') {
      return JSON.parse(projects)
    }
    return projects || []
  } catch {
    return []
  }
}

export function formatProjectLines(projects) {
  if (!projects || projects.length === 0) {
    return ['No projects']
  }
  return projects.map((project) => {
    const name = project?.name || 'Unnamed project'
    const hours = project?.hours || 0
    const location = project?.location ? ` @ ${project.location}` : ''
    return `- ${name} (${hours}h)${location}`
  })
}

export function buildReportRows(workHours) {
  return workHours.map((entry) => {
    const entryDate = DateTime.fromJSDate(entry.date).setZone(REPORT_TIMEZONE)
    const projects = parseProjects(entry.projects)
    return {
      employee: entry.employee?.fullName || entry.employee?.name || 'Unknown',
      date: entryDate.toFormat('yyyy-MM-dd'),
      day: entryDate.toFormat('EEEE'),
      projects: formatProjectLines(projects),
      hours: entry.hoursWorked,
      description: entry.description || 'N/A',
      signature: entry.signature && entry.signature !== 'admin-added' ? 'Signed' : 'Admin Added',
    }
  })
}

export async function generateExcelReport(workHours, startDate, endDate) {
  const workbook = new ExcelJS.Workbook()
  const summarySheet = workbook.addWorksheet('All Employees Summary')

  summarySheet.columns = [
    { header: 'Employee', key: 'employee', width: 25 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Day', key: 'day', width: 12 },
    { header: 'Projects', key: 'projects', width: 40 },
    { header: 'Hours', key: 'hours', width: 10 },
    { header: 'Description', key: 'description', width: 35 },
    { header: 'Signature', key: 'signature', width: 20 }
  ]

  const headerRow = summarySheet.getRow(1)
  headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 25

  const employeeGroups = {}
  for (const entry of workHours) {
    const employeeName = entry.employee?.fullName || entry.employee?.name || 'Unknown'
    if (!employeeGroups[employeeName]) {
      employeeGroups[employeeName] = []
    }
    employeeGroups[employeeName].push(entry)
  }

  let currentRow = 2

  for (const [employeeName, entries] of Object.entries(employeeGroups)) {
    const empHeaderRow = summarySheet.getRow(currentRow)
    empHeaderRow.getCell(1).value = `> ${employeeName.toUpperCase()}`
    empHeaderRow.font = { bold: true, size: 11 }
    empHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' }
    }
    empHeaderRow.height = 20
    summarySheet.mergeCells(currentRow, 1, currentRow, 7)
    currentRow++

    let employeeTotal = 0

    for (const entry of entries) {
      const entryDate = DateTime.fromJSDate(entry.date).setZone(REPORT_TIMEZONE)
      const dateStr = entryDate.toFormat('yyyy-MM-dd')
      const dayStr = entryDate.toFormat('EEEE')
      const projects = parseProjects(entry.projects)
      const projectDetails = formatProjectLines(projects).join('\n')

      employeeTotal += entry.hoursWorked

      const row = summarySheet.getRow(currentRow)
      row.values = {
        employee: `  ${employeeName}`,
        date: dateStr,
        day: dayStr,
        projects: projectDetails,
        hours: entry.hoursWorked,
        description: entry.description || 'N/A',
        signature: entry.signature && entry.signature !== 'admin-added' ? 'Signed' : 'Admin Added'
      }

      row.getCell('projects').alignment = { wrapText: true, vertical: 'top' }
      row.getCell('description').alignment = { wrapText: true, vertical: 'top' }
      row.height = Math.max(30, projects.length * 15)
      row.font = { size: 10 }

      const dayOfWeek = entryDate.weekday
      if (dayOfWeek === 6 || dayOfWeek === 7) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF4CC' }
        }
      } else if (currentRow % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9F9F9' }
        }
      }

      if (entry.signature && entry.signature.startsWith('data:image')) {
        try {
          const base64Data = entry.signature.split(',')[1]
          const imageId = workbook.addImage({
            base64: base64Data,
            extension: 'png',
          })
          summarySheet.addImage(imageId, {
            tl: { col: 6, row: currentRow - 1 },
            ext: { width: 100, height: 40 }
          })
          row.height = Math.max(row.height, 50)
        } catch (err) {
          console.error('Error adding signature image:', err)
        }
      }

      currentRow++
    }

    const subtotalRow = summarySheet.getRow(currentRow)
    subtotalRow.values = {
      employee: `  ${employeeName} - SUBTOTAL:`,
      hours: employeeTotal
    }
    subtotalRow.font = { bold: true, size: 10 }
    subtotalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD966' }
    }
    subtotalRow.getCell('hours').font = { bold: true, size: 11, color: { argb: 'FF1E3A8A' } }
    currentRow++
    currentRow++

    const safeSheetName = employeeName.replace(/[/\\?*\[\]]/g, '-').substring(0, 31)
    const empSheet = workbook.addWorksheet(safeSheetName)
    empSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Day', key: 'day', width: 12 },
      { header: 'Projects', key: 'projects', width: 40 },
      { header: 'Hours', key: 'hours', width: 10 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Signature', key: 'signature', width: 20 }
    ]

    const empHeaderRowSheet = empSheet.getRow(1)
    empHeaderRowSheet.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    empHeaderRowSheet.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    }
    empHeaderRowSheet.alignment = { vertical: 'middle', horizontal: 'center' }
    empHeaderRowSheet.height = 25

    empSheet.insertRow(1, [employeeName])
    const nameRow = empSheet.getRow(1)
    nameRow.font = { bold: true, size: 14 }
    nameRow.height = 30
    empSheet.mergeCells(1, 1, 1, 6)

    let empRowNum = 3

    for (const entry of entries) {
      const entryDate = DateTime.fromJSDate(entry.date).setZone(REPORT_TIMEZONE)
      const dateStr = entryDate.toFormat('yyyy-MM-dd')
      const dayStr = entryDate.toFormat('EEEE')
      const projects = parseProjects(entry.projects)
      const projectDetails = formatProjectLines(projects).join('\n')

      const empRow = empSheet.getRow(empRowNum)
      empRow.values = {
        date: dateStr,
        day: dayStr,
        projects: projectDetails,
        hours: entry.hoursWorked,
        description: entry.description || 'N/A',
        signature: entry.signature && entry.signature !== 'admin-added' ? 'Signed' : 'Admin Added'
      }

      empRow.getCell('projects').alignment = { wrapText: true, vertical: 'top' }
      empRow.getCell('description').alignment = { wrapText: true, vertical: 'top' }
      empRow.height = Math.max(30, projects.length * 15)

      const dayOfWeek = entryDate.weekday
      if (dayOfWeek === 6 || dayOfWeek === 7) {
        empRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF4CC' }
        }
      } else if (empRowNum % 2 === 0) {
        empRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9F9F9' }
        }
      }

      if (entry.signature && entry.signature.startsWith('data:image')) {
        try {
          const base64Data = entry.signature.split(',')[1]
          const imageId = workbook.addImage({
            base64: base64Data,
            extension: 'png',
          })
          empSheet.addImage(imageId, {
            tl: { col: 5, row: empRowNum - 1 },
            ext: { width: 100, height: 40 }
          })
          empRow.height = Math.max(empRow.height, 50)
        } catch (err) {
          console.error('Error adding employee signature:', err)
        }
      }

      empRowNum++
    }

    const totalRow = empSheet.getRow(empRowNum + 1)
    totalRow.values = {
      date: 'TOTAL HOURS:',
      hours: employeeTotal
    }
    totalRow.font = { bold: true, size: 12 }
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFD966' }
    }
    totalRow.getCell('hours').font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } }
    totalRow.height = 25
  }

  const grandTotal = workHours.reduce((sum, entry) => sum + entry.hoursWorked, 0)
  const grandTotalRow = summarySheet.getRow(currentRow)
  grandTotalRow.values = {
    employee: 'GRAND TOTAL ALL EMPLOYEES:',
    hours: grandTotal
  }
  grandTotalRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
  grandTotalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }
  }
  grandTotalRow.getCell('hours').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
  grandTotalRow.height = 30

  const buffer = await workbook.xlsx.writeBuffer()
  return buffer
}
