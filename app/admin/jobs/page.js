import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getLastActivityByJobName } from '@/lib/jobHours'
import JobsListClient from '@/components/admin/JobsListClient'

export default async function AdminJobsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const [jobs, lastActivity] = await Promise.all([
    prisma.projectName.findMany({
      orderBy: [{ name: 'asc' }],
      include: { _count: { select: { receipts: true } } },
    }),
    getLastActivityByJobName(),
  ])

  const jobsWithActivity = jobs.map((job) => ({
    id: job.id,
    name: job.name,
    client: job.client,
    status: job.status,
    receiptCount: job._count.receipts,
    lastActivity: lastActivity[job.name] ? lastActivity[job.name].toISOString() : null,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
        <p className="text-muted-foreground">Hours, receipts, and invoicing status by job</p>
      </div>

      <JobsListClient jobs={jobsWithActivity} />
    </div>
  )
}
