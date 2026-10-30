import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { getJobHourRows } from '@/lib/jobHours'
import { NextResponse } from 'next/server'
import { DateTime } from 'luxon'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { PDFDocument } from 'pdf-lib'

const TZ = 'America/Los_Angeles'

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const jobId = parseInt(id)
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start) {
      return NextResponse.json({ error: 'start date is required' }, { status: 400 })
    }

    const job = await prisma.projectName.findUnique({ where: { id: jobId } })
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const { rows, totalHours } = await getJobHourRows(job.name, { start, end })

    // Receipts whose date falls in range; fall back to createdAt when no date was set.
    const startDt = DateTime.fromISO(start, { zone: TZ }).startOf('day').toJSDate()
    const endDt = end
      ? DateTime.fromISO(end, { zone: TZ }).endOf('day').toJSDate()
      : DateTime.now().setZone(TZ).endOf('day').toJSDate()

    const allReceipts = await prisma.receipt.findMany({
      where: { projectId: jobId },
      orderBy: { date: 'asc' },
    })
    const receipts = allReceipts.filter((r) => {
      const d = r.date || r.createdAt
      return d >= startDt && d <= endDt
    })

    const receiptsTotal = receipts.reduce((sum, r) => sum + (r.amount || 0), 0)

    // ── Build the hours summary page with jsPDF ────────────────────────────
    const doc = new jsPDF({ unit: 'pt', format: 'letter' })
    doc.setFontSize(18)
    doc.text('Invoice Preparation Packet', 40, 50)
    doc.setFontSize(12)
    doc.text(`Job: ${job.name}`, 40, 75)
    if (job.client) doc.text(`Client: ${job.client}`, 40, 92)
    if (job.siteAddress) doc.text(`Site: ${job.siteAddress}`, 40, job.client ? 109 : 92)
    const periodY = job.client && job.siteAddress ? 126 : job.client || job.siteAddress ? 109 : 92
    doc.text(`Period: ${start} to ${end || 'present'}`, 40, periodY)

    autoTable(doc, {
      startY: periodY + 20,
      head: [['Date', 'Employee', 'Description', 'Hours']],
      body: rows.map((r) => [r.date, r.name, r.description || '—', r.hours.toFixed(1)]),
      foot: [['', '', 'Total', totalHours.toFixed(1)]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    })

    const afterHoursY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 30 : periodY + 40
    doc.setFontSize(13)
    doc.text('Receipts & Invoices', 40, afterHoursY)
    autoTable(doc, {
      startY: afterHoursY + 12,
      head: [['Date', 'Vendor', 'Amount']],
      body: receipts.map((r) => [
        r.date ? DateTime.fromJSDate(r.date).setZone(TZ).toFormat('yyyy-MM-dd') : '—',
        r.vendor || r.fileName || '—',
        r.amount != null ? `$${r.amount.toFixed(2)}` : '—',
      ]),
      foot: [['', 'Total', `$${receiptsTotal.toFixed(2)}`]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    })

    const summaryBytes = doc.output('arraybuffer')

    // ── Merge in the actual receipt files (images + PDFs) ──────────────────
    const outPdf = await PDFDocument.load(summaryBytes)

    for (const receipt of receipts) {
      try {
        const res = await fetch(receipt.fileUrl)
        if (!res.ok) continue
        const bytes = await res.arrayBuffer()

        if (receipt.fileType === 'application/pdf') {
          const srcDoc = await PDFDocument.load(bytes)
          const copiedPages = await outPdf.copyPages(srcDoc, srcDoc.getPageIndices())
          copiedPages.forEach((p) => outPdf.addPage(p))
        } else {
          let image
          if (receipt.fileType === 'image/png') {
            image = await outPdf.embedPng(bytes)
          } else {
            // jpeg, webp, heic etc. — try JPEG embed; skip silently if it fails
            image = await outPdf.embedJpg(bytes).catch(() => null)
          }
          if (image) {
            const page = outPdf.addPage([612, 792]) // letter size in points
            const maxW = 532 // 612 - 2*40 margin
            const maxH = 712
            const scale = Math.min(maxW / image.width, maxH / image.height, 1)
            const w = image.width * scale
            const h = image.height * scale
            page.drawImage(image, {
              x: (612 - w) / 2,
              y: (792 - h) / 2,
              width: w,
              height: h,
            })
          }
        }
      } catch (err) {
        console.error(`Skipping receipt ${receipt.id} in packet:`, err.message)
      }
    }

    const finalBytes = await outPdf.save()

    // Mark the job ready to invoice
    await prisma.projectName.update({
      where: { id: jobId },
      data: { status: 'ready_to_invoice' },
    })

    return new NextResponse(Buffer.from(finalBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-packet.pdf"`,
      },
    })
  } catch (error) {
    console.error('Invoice packet error:', error)
    return NextResponse.json({ error: 'Failed to prepare packet: ' + error.message }, { status: 500 })
  }
}
