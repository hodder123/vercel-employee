import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import LogoutButton from '@/components/LogoutButton'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, User, ChevronRight } from 'lucide-react'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Redirect admins to admin dashboard
  if (session.user.role === 'admin') {
    redirect('/admin')
  }

  const username = session.user.name

  const employee = await prisma.employee.findUnique({
    where: { name: username }
  })

  const fullName = employee?.fullName || username

  let workHours = []
  if (employee) {
    workHours = await prisma.workHour.findMany({
      where: { employeeId: employee.id },
      orderBy: { date: 'desc' },
      take: 3
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Welcome, {fullName}</h1>
              <p className="text-sm text-slate-700">User Dashboard</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link href="/work-hours" className="group">
            <Card className="transition-all hover:shadow-md hover:border-blue-300 h-full">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-lg flex-shrink-0">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Work Hours</h3>
                  <p className="text-sm text-muted-foreground">Log and view your time</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/edit-profile" className="group">
            <Card className="transition-all hover:shadow-md hover:border-green-300 h-full">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-lg flex-shrink-0">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">My Profile</h3>
                  <p className="text-sm text-muted-foreground">Edit your details</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-green-500 transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Hours</CardTitle>
          </CardHeader>
          <CardContent>
            {workHours.length === 0 ? (
              <p className="text-muted-foreground">No hours logged yet.</p>
            ) : (
              <div className="space-y-3">
                {workHours.map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{new Date(entry.date).toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground">{entry.description || 'No description'}</p>
                    </div>
                    <Badge variant="info" className="text-base px-3 py-1">{entry.hoursWorked}h</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
