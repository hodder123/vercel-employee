import { getServerSession } from 'next-auth'
import { authOptions } from '../../../api/auth/[...nextauth]/route'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getJobHourRows } from '@/lib/jobHours'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Clock } from 'lucide-react'
import JobEditForm from '@/components/admin/JobEditForm'
import ReceiptUploadForm from '@/components/admin/ReceiptUploadForm'
import ReceiptList from '@/components/admin/ReceiptList'
import PrepareInvoiceCard from '@/components/admin/PrepareInvoiceCard'

const STATUS_LABEL = {
  active: 'Active',
  ready_to_invoice: 'Ready to Invoice',
  invoiced: 'Invoiced',
  paid: 'Paid',
}
const STATUS_VARIANT = {
  active: 'info',
  ready_to_invoice: 'warning',
  invoiced: 'success',
  paid: 'success',
}

export default async function AdminJobDetailPage({ params }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const { id } = await params
  const jobId = parseInt(id)

  const job = await prisma.projectName.findUnique({
    where: { id: jobId },
    include: { receipts: { orderBy: { date: 'desc' } } },
  })

  if (!job) notFound()

  const { rows, totalHours } = await getJobHourRows(job.name)
  const receiptsTotal = job.receipts.reduce((sum, r) => sum + (r.amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/jobs" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Jobs
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{job.name}</h1>
          <p className="text-muted-foreground">{job.client || 'No client set'}</p>
        </div>
        <Badge variant={STATUS_VARIANT[job.status] || 'info'} className="text-sm px-3 py-1">
          {STATUS_LABEL[job.status] || job.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" /> Hours
              </CardTitle>
              <p className="text-sm text-muted-foreground">{totalHours.toFixed(1)}h total, all time</p>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hours logged against this job yet.</p>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.date}</TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell className="text-muted-foreground">{r.description || '—'}</TableCell>
                          <TableCell className="text-right">{r.hours.toFixed(1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Receipts & Invoices</CardTitle>
              <p className="text-sm text-muted-foreground">
                {job.receipts.length} file{job.receipts.length === 1 ? '' : 's'}
                {receiptsTotal > 0 ? ` · $${receiptsTotal.toFixed(2)} total` : ''}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ReceiptUploadForm jobId={job.id} />
              <ReceiptList receipts={job.receipts} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent>
              <JobEditForm job={job} />
            </CardContent>
          </Card>

          <PrepareInvoiceCard jobId={job.id} jobName={job.name} />
        </div>
      </div>
    </div>
  )
}
