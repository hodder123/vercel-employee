import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'
import nodemailer from 'nodemailer'
import { DateTime } from 'luxon'

export async function GET(request) {
  try {
    // Verify this is being called by Vercel Cron or has the secret token
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-cron-secret-change-in-production'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Set timezone to Kamloops (Pacific Time)
    const now = DateTime.now().setZone('America/Vancouver')
    
    // Get the current week's Monday (week that just ended)
    // Since this runs Sunday 9 PM, we want Monday-Sunday of THIS week
    const thisMonday = now.startOf('week') // Monday of current week
    const thisSunday = now.startOf('week').plus({ days: 6 }) // Sunday of current week
    
    // Set cutoff to 8 PM on Sunday
    const cutoffTime = thisSunday.set({ hour: 20, minute: 0, second: 0 })

    console.log(`Generating report for ${thisMonday.toISODate()} to ${thisSunday.toISODate()} (cutoff: ${cutoffTime.toISO()})`)

    // Fetch all work hours from Monday to Sunday (up to 8 PM Sunday)
    const workHours = await prisma.workHour.findMany({
      where: {
        date: {
          gte: thisMonday.toJSDate(),
          lte: thisSunday.toJSDate()
        },
        createdAt: {
          lte: cutoffTime.toJSDate() // Only include entries created before 8 PM Sunday
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

    if (workHours.length === 0) {
      // Send email saying no hours logged
      await sendNoHoursEmail(thisMonday, thisSunday)
      return NextResponse.json({ 
        success: true, 
        message: 'No hours logged this week. Email sent.' 
      })
    }

    // Generate Excel file
    const excelBuffer = await generateExcelReport(workHours, thisMonday, thisSunday)

    // Send email with Excel attachment
    await sendReportEmail(excelBuffer, thisMonday, thisSunday)

    return NextResponse.json({ 
      success: true, 
      message: `Report generated and sent for ${thisMonday.toISODate()} to ${thisSunday.toISODate()}`,
      entriesCount: workHours.length
    })

  } catch (error) {
    console.error('Error generating weekly report:', error)
    return NextResponse.json({ 
      error: 'Failed to generate report: ' + error.message 
    }, { status: 500 })
  }
}

async function generateExcelReport(workHours, startDate, endDate) {
  const workbook = new ExcelJS.Workbook()
  
  // Summary sheet
  const summarySheet = workbook.addWorksheet('All Employees Summary')
  
  // Set column widths
  summarySheet.columns = [
    { header: 'Employee', key: 'employee', width: 25 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Day', key: 'day', width: 12 },
    { header: 'Projects', key: 'projects', width: 40 },
    { header: 'Hours', key: 'hours', width: 10 },
    { header: 'Description', key: 'description', width: 35 },
    { header: 'Signature', key: 'signature', width: 20 }
  ]

  // Style header row
  const headerRow = summarySheet.getRow(1)
  headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0070C0' }
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 25

  // Group work hours by employee
  const employeeGroups = {}
  for (const entry of workHours) {
    const employeeName = entry.employee?.fullName || entry.employee?.name || 'Unknown'
    if (!employeeGroups[employeeName]) {
      employeeGroups[employeeName] = []
    }
    employeeGroups[employeeName].push(entry)
  }

  // Add data rows grouped by employee
  const employeeSheets = {}
  let currentRow = 2

  for (const [employeeName, entries] of Object.entries(employeeGroups)) {
    // Add employee header row in summary
    const empHeaderRow = summarySheet.getRow(currentRow)
    empHeaderRow.getCell(1).value = `▼ ${employeeName.toUpperCase()}`
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

    // Add entries for this employee
    for (const entry of entries) {
      const entryDate = DateTime.fromJSDate(entry.date)
      const dateStr = entryDate.toFormat('yyyy-MM-dd')
      const dayStr = entryDate.toFormat('EEEE') // Monday, Tuesday, etc.
      
      // Parse projects
      const projects = parseProjects(entry.projects)
      const projectDetails = projects.length > 0
        ? projects.map(p => `• ${p.name} (${p.hours || 0}h) @ ${p.location || 'N/A'}`).join('\n')
        : 'No projects'

      employeeTotal += entry.hoursWorked

      // Add to summary sheet
      const row = summarySheet.getRow(currentRow)
      row.values = {
        employee: '  ' + employeeName,
        date: dateStr,
        day: dayStr,
        projects: projectDetails,
        hours: entry.hoursWorked,
        description: entry.description || 'N/A',
        signature: entry.signature && entry.signature !== 'admin-added' ? 'Signed' : 'Admin Added'
      }

      // Styling
      row.getCell('projects').alignment = { wrapText: true, vertical: 'top' }
      row.getCell('description').alignment = { wrapText: true, vertical: 'top' }
      row.height = Math.max(30, projects.length * 15)
      row.font = { size: 10 }

      // Weekend highlighting (Saturday/Sunday)
      const dayOfWeek = entryDate.weekday // 1=Monday, 7=Sunday
      if (dayOfWeek === 6 || dayOfWeek === 7) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF4CC' } // Light yellow for weekends
        }
      } else if (currentRow % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9F9F9' }
        }
      }

      // Add signature image if available
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

    // Add subtotal row for this employee
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
    subtotalRow.getCell('hours').font = { bold: true, size: 11, color: { argb: 'FF0070C0' } }
    currentRow++

    // Add spacing row
    currentRow++

    // Create individual employee sheet
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
    
    // Style employee sheet header
    const empHeaderRowSheet = empSheet.getRow(1)
    empHeaderRowSheet.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    empHeaderRowSheet.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0070C0' }
    }
    empHeaderRowSheet.alignment = { vertical: 'middle', horizontal: 'center' }
    empHeaderRowSheet.height = 25

    // Add employee name at top
    empSheet.insertRow(1, [employeeName])
    const nameRow = empSheet.getRow(1)
    nameRow.font = { bold: true, size: 14 }
    nameRow.height = 30
    empSheet.mergeCells(1, 1, 1, 6)

    let empRowNum = 3

    // Add entries to employee sheet
    for (const entry of entries) {
      const entryDate = DateTime.fromJSDate(entry.date)
      const dateStr = entryDate.toFormat('yyyy-MM-dd')
      const dayStr = entryDate.toFormat('EEEE')
      const projects = parseProjects(entry.projects)
      const projectDetails = projects.length > 0
        ? projects.map(p => `• ${p.name} (${p.hours || 0}h) @ ${p.location || 'N/A'}`).join('\n')
        : 'No projects'

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

      // Weekend highlighting
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

      // Add signature
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

    // Add total to employee sheet
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
    totalRow.getCell('hours').font = { bold: true, size: 14, color: { argb: 'FF0070C0' } }
    totalRow.height = 25

    employeeSheets[safeSheetName] = empSheet
  }

  // Add grand total to summary sheet
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
    fgColor: { argb: 'FF0070C0' }
  }
  grandTotalRow.getCell('hours').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
  grandTotalRow.height = 30

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  return buffer
}

function parseProjects(projects) {
  try {
    if (typeof projects === 'string') {
      return JSON.parse(projects)
    }
    return projects || []
  } catch {
    return []
  }
}

async function sendReportEmail(excelBuffer, startDate, endDate) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })

  const filename = `Weekly_Report_${startDate.toFormat('MMM-dd')}_to_${endDate.toFormat('MMM-dd-yyyy')}.xlsx`

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.REPORT_RECIPIENT || 'employee.hodder@gmail.com',
    subject: `Weekly Work Hours Report: ${startDate.toFormat('MMM dd')} - ${endDate.toFormat('MMM dd, yyyy')}`,
    text: `Attached is the weekly work hours report for the week of ${startDate.toFormat('MMMM dd')} to ${endDate.toFormat('MMMM dd, yyyy')} (Monday-Sunday).\n\nThis report includes all employee hours logged during this period (up to 8 PM Sunday).`,
    html: `
      <h2>Weekly Work Hours Report</h2>
      <p><strong>Period:</strong> ${startDate.toFormat('MMMM dd')} - ${endDate.toFormat('MMMM dd, yyyy')} (Monday-Sunday)</p>
      <p><strong>Cutoff:</strong> Sunday 8:00 PM</p>
      <p>Attached is the Excel report containing all employee hours for this week.</p>
      <p>The report includes:</p>
      <ul>
        <li>Summary sheet with all employees</li>
        <li>Individual sheets for each employee</li>
        <li>Day of week for each entry</li>
        <li>Weekend entries highlighted in yellow</li>
        <li>Digital signatures (where provided)</li>
        <li>Project details and descriptions</li>
      </ul>
    `,
    attachments: [
      {
        filename: filename,
        content: excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    ]
  })
}

async function sendNoHoursEmail(startDate, endDate) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.REPORT_RECIPIENT || 'employee.hodder@gmail.com',
    subject: `Weekly Work Hours Report: ${startDate.toFormat('MMM dd')} - ${endDate.toFormat('MMM dd, yyyy')} - NO HOURS LOGGED`,
    text: `No work hours were logged for the week of ${startDate.toFormat('MMMM dd')} to ${endDate.toFormat('MMMM dd, yyyy')} (Monday-Sunday).`,
    html: `
      <h2>Weekly Work Hours Report</h2>
      <p><strong>Period:</strong> ${startDate.toFormat('MMMM dd')} - ${endDate.toFormat('MMMM dd, yyyy')} (Monday-Sunday)</p>
      <p><strong style="color: red;">NO HOURS WERE LOGGED THIS WEEK</strong></p>
    `
  })
}