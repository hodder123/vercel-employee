import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'
import { DateTime } from 'luxon'
import { generateExcelReport, getDefaultWeeklyRange, REPORT_TIMEZONE } from '@/lib/reporting'

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-cron-secret-change-in-production'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = DateTime.now().setZone(REPORT_TIMEZONE)
    const { start, end, cutoffTime } = getDefaultWeeklyRange(now)

    console.log(`Generating report for ${start.toISODate()} to ${end.toISODate()} (cutoff: ${cutoffTime.toISO()})`)

    const workHours = await prisma.workHour.findMany({
      where: {
        date: {
          gte: start.toJSDate(),
          lte: end.toJSDate()
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

    if (workHours.length === 0) {
      await sendNoHoursEmail(start, end, cutoffTime)
      return NextResponse.json({
        success: true,
        message: 'No hours logged this week. Email sent.'
      })
    }

    const excelBuffer = await generateExcelReport(workHours, start, end)
    await sendReportEmail(excelBuffer, start, end, cutoffTime)

    return NextResponse.json({
      success: true,
      message: `Report generated and sent for ${start.toISODate()} to ${end.toISODate()}`,
      entriesCount: workHours.length
    })
  } catch (error) {
    console.error('Error generating weekly report:', error)
    return NextResponse.json({
      error: 'Failed to generate report: ' + error.message
    }, { status: 500 })
  }
}

async function sendReportEmail(excelBuffer, startDate, endDate, cutoffTime) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })

  const filename = `Weekly_Report_${startDate.toFormat('MMM-dd')}_to_${endDate.toFormat('MMM-dd-yyyy')}.xlsx`
  const cutoffLabel = cutoffTime
    ? cutoffTime.toFormat('cccc, MMM dd, h:mm a')
    : 'End of day'

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.REPORT_RECIPIENT || 'employee.hodder@gmail.com',
    subject: `Weekly Work Hours Report: ${startDate.toFormat('MMM dd')} - ${endDate.toFormat('MMM dd, yyyy')}`,
    text: `Attached is the weekly work hours report for ${startDate.toFormat('MMMM dd')} to ${endDate.toFormat('MMMM dd, yyyy')} (Monday-Sunday).\n\nCutoff: ${cutoffLabel} PT.`,
    html: `
      <h2>Weekly Work Hours Report</h2>
      <p><strong>Period:</strong> ${startDate.toFormat('MMMM dd')} - ${endDate.toFormat('MMMM dd, yyyy')} (Monday-Sunday)</p>
      <p><strong>Cutoff:</strong> ${cutoffLabel} PT</p>
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

async function sendNoHoursEmail(startDate, endDate, cutoffTime) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })

  const cutoffLabel = cutoffTime
    ? cutoffTime.toFormat('cccc, MMM dd, h:mm a')
    : 'End of day'

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.REPORT_RECIPIENT || 'employee.hodder@gmail.com',
    subject: `Weekly Work Hours Report: ${startDate.toFormat('MMM dd')} - ${endDate.toFormat('MMM dd, yyyy')} - NO HOURS LOGGED`,
    text: `No work hours were logged for the week of ${startDate.toFormat('MMMM dd')} to ${endDate.toFormat('MMMM dd, yyyy')} (Monday-Sunday).`,
    html: `
      <h2>Weekly Work Hours Report</h2>
      <p><strong>Period:</strong> ${startDate.toFormat('MMMM dd')} - ${endDate.toFormat('MMMM dd, yyyy')} (Monday-Sunday)</p>
      <p><strong>Cutoff:</strong> ${cutoffLabel} PT</p>
      <p><strong style="color: red;">NO HOURS WERE LOGGED THIS WEEK</strong></p>
    `
  })
}
