import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'
import { DateTime } from 'luxon'
import { generateExcelReport, getCustomRange, getDefaultWeeklyRange, REPORT_TIMEZONE } from '@/lib/reporting'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startDate, endDate, extraEmail } = body || {}

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

    const recipients = buildRecipients(extraEmail)

    if (workHours.length === 0) {
      await sendNoHoursEmail(range.start, range.end, cutoffTime, recipients)
      return NextResponse.json({
        success: true,
        message: 'No hours logged for this period. Email sent.'
      })
    }

    const excelBuffer = await generateExcelReport(workHours, range.start, range.end)
    await sendReportEmail(excelBuffer, range.start, range.end, cutoffTime, recipients)

    return NextResponse.json({
      success: true,
      message: `Report generated and sent for ${range.start.toISODate()} to ${range.end.toISODate()}`,
      entriesCount: workHours.length
    })
  } catch (error) {
    console.error('Send report error:', error)
    return NextResponse.json({ error: 'Failed to send report' }, { status: 500 })
  }
}

function buildRecipients(extraEmail) {
  const defaultRecipient = process.env.REPORT_RECIPIENT || 'employee.hodder@gmail.com'
  const extras = (extraEmail || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  const recipients = Array.from(new Set([defaultRecipient, ...extras]))
  return recipients
}

async function sendReportEmail(excelBuffer, startDate, endDate, cutoffTime, recipients) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })

  const filename = `Work_Hours_${startDate.toFormat('MMM-dd')}_to_${endDate.toFormat('MMM-dd-yyyy')}.xlsx`
  const cutoffLabel = cutoffTime
    ? cutoffTime.toFormat('cccc, MMM dd, h:mm a')
    : 'End of day'

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: recipients,
    subject: `Work Hours Report: ${startDate.toFormat('MMM dd')} - ${endDate.toFormat('MMM dd, yyyy')}`,
    text: `Attached is the work hours report for ${startDate.toFormat('MMMM dd')} to ${endDate.toFormat('MMMM dd, yyyy')}.\n\nCutoff: ${cutoffLabel} PT.`,
    html: `
      <h2>Work Hours Report</h2>
      <p><strong>Period:</strong> ${startDate.toFormat('MMMM dd')} - ${endDate.toFormat('MMMM dd, yyyy')}</p>
      <p><strong>Cutoff:</strong> ${cutoffLabel} PT</p>
      <p>Attached is the Excel report containing all employee hours for this period.</p>
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

async function sendNoHoursEmail(startDate, endDate, cutoffTime, recipients) {
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
    to: recipients,
    subject: `Work Hours Report: ${startDate.toFormat('MMM dd')} - ${endDate.toFormat('MMM dd, yyyy')} - NO HOURS LOGGED`,
    text: `No work hours were logged for ${startDate.toFormat('MMMM dd')} to ${endDate.toFormat('MMMM dd, yyyy')}.`,
    html: `
      <h2>Work Hours Report</h2>
      <p><strong>Period:</strong> ${startDate.toFormat('MMMM dd')} - ${endDate.toFormat('MMMM dd, yyyy')}</p>
      <p><strong>Cutoff:</strong> ${cutoffLabel} PT</p>
      <p><strong style="color: red;">NO HOURS WERE LOGGED FOR THIS PERIOD</strong></p>
    `
  })
}
