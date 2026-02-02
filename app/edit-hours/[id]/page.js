import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import UserEditHoursForm from '@/components/UserEditHoursForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

export default async function UserEditHoursPage({ params }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
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

  if (workHour.employee.name !== session.user.name) {
    return <div className="p-8 text-center text-destructive">You can only edit your own entries</div>
  }

  const createdAt = new Date(workHour.createdAt)
  const now = new Date()
  const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60)

  if (hoursSinceCreation > 12) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <h2 className="text-xl font-bold">Edit Window Expired</h2>
              </div>
              <p className="text-muted-foreground">
                You can only edit entries within 12 hours of creation. This entry was created {hoursSinceCreation.toFixed(1)} hours ago.
              </p>
              <Link href="/work-hours" className="inline-flex items-center text-sm text-primary hover:underline">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Work Hours
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const parseProjects = (projects) => {
    try {
      if (typeof projects === 'string') return JSON.parse(projects)
      return projects || []
    } catch { return [] }
  }

  const timeRemaining = Math.max(0, 12 - hoursSinceCreation)

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Edit Work Hours</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {new Date(workHour.date).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}
                </span>
                <Badge variant="warning">{timeRemaining.toFixed(1)}h left to edit</Badge>
              </div>
            </div>
            <Link href="/work-hours" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-6">
            <UserEditHoursForm workHour={{ ...workHour, projects: parseProjects(workHour.projects) }} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
