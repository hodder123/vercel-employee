import { getServerSession } from 'next-auth'
import { authOptions } from '../../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import EditHoursForm from '@/components/EditHoursForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft, Clock } from 'lucide-react'

const SUBMITTED_FMT = {
  year: 'numeric', month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit',
  timeZone: 'America/Los_Angeles', timeZoneName: 'short'
}

function formatSubmitted(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('en-US', SUBMITTED_FMT)
}

export default async function EditHoursPage({ params }) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const { id } = await params
  const workHour = await prisma.workHour.findUnique({
    where: { id: parseInt(id) },
    include: {
      employee: { select: { id: true, name: true, fullName: true } }
    }
  })

  if (!workHour) {
    return <div className="p-8 text-center">Work hour entry not found</div>
  }

  const parseProjects = (projects) => {
    try {
      if (typeof projects === 'string') return JSON.parse(projects)
      return projects || []
    } catch { return [] }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link href={`/admin/employee/${workHour.employeeId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to {workHour.employee?.fullName || workHour.employee?.name}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Edit Work Hours</CardTitle>
          <CardDescription>
            {workHour.employee?.fullName || workHour.employee?.name} &middot; {new Date(workHour.date).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}
          </CardDescription>
          {/* Admin-only submission timestamp (page is gated to admins above) */}
          {workHour.createdAt && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="font-medium text-foreground">Submitted:</span>
                {formatSubmitted(workHour.createdAt)}
              </span>
              {workHour.updatedAt &&
                new Date(workHour.updatedAt).getTime() - new Date(workHour.createdAt).getTime() > 60_000 && (
                  <span className="flex items-center gap-1">
                    <span className="font-medium text-foreground">Last edited:</span>
                    {formatSubmitted(workHour.updatedAt)}
                  </span>
                )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <EditHoursForm workHour={{ ...workHour, projects: parseProjects(workHour.projects) }} />
        </CardContent>
      </Card>
    </div>
  )
}
