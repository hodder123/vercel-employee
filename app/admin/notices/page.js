import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import NoticesManager from '@/components/admin/NoticesManager'

export const dynamic = 'force-dynamic'

export default async function AdminNoticesPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') redirect('/dashboard')

  let notices = []
  let tableMissing = false
  try {
    notices = await prisma.notice.findMany({ orderBy: { createdAt: 'desc' } })
  } catch (e) {
    tableMissing = true
  }

  const employees = await prisma.employee.findMany({
    where: { role: { not: 'admin' } },
    select: { id: true, name: true, fullName: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notices</h1>
        <p className="text-muted-foreground">Messages shown at the top of selected employees&apos; timesheet page.</p>
      </div>
      {tableMissing ? (
        <p className="text-sm text-destructive">Notices aren&apos;t set up yet (database table missing).</p>
      ) : (
        <NoticesManager
          initialNotices={notices.map((n) => ({ ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() }))}
          employees={employees}
        />
      )}
    </div>
  )
}
