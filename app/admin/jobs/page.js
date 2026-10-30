import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Briefcase, ChevronRight, Receipt } from 'lucide-react'

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

export default async function AdminJobsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const jobs = await prisma.projectName.findMany({
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { receipts: true } } },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
        <p className="text-muted-foreground">Hours, receipts, and invoicing status by job</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/admin/jobs/${job.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{job.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {job.client || 'No client set'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {job._count.receipts > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Receipt className="h-3.5 w-3.5" /> {job._count.receipts}
                    </span>
                  )}
                  <Badge variant={STATUS_VARIANT[job.status] || 'info'}>
                    {STATUS_LABEL[job.status] || job.status}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
            {jobs.length === 0 && (
              <p className="p-6 text-center text-muted-foreground">
                No jobs yet. Add project names in Settings to create jobs.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
