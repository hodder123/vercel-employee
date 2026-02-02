import { getServerSession } from 'next-auth'
import { authOptions } from '../../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import EditHoursForm from '@/components/EditHoursForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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
        </CardHeader>
        <CardContent>
          <EditHoursForm workHour={{ ...workHour, projects: parseProjects(workHour.projects) }} />
        </CardContent>
      </Card>
    </div>
  )
}
