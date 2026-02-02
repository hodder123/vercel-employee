import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import WorkHoursForm from '@/components/WorkHoursForm'
import WorkHoursList from '@/components/WorkHoursList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Info, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 5

export default async function WorkHoursPage({ searchParams }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const username = session.user.name
  const role = session.user.role

  if (role === 'admin') {
    redirect('/admin')
  }

  const employee = await prisma.employee.findUnique({
    where: { name: username }
  })

  if (!employee) {
    return <div>Employee not found</div>
  }

  const params = await searchParams
  const page = Math.max(1, parseInt(params?.page) || 1)

  const totalEntries = await prisma.workHour.count({
    where: { employeeId: employee.id }
  })
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const workHours = await prisma.workHour.findMany({
    where: { employeeId: employee.id },
    orderBy: { date: 'desc' },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE
  })

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Work Hours</h1>
              <p className="text-sm text-slate-700">Log and view your time entries</p>
            </div>
            <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Add New Entry</CardTitle>
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800 mt-2">
                <Info className="h-4 w-4 flex-shrink-0" />
                You can only log hours for today or yesterday (PST)
              </div>
            </CardHeader>
            <CardContent>
              <WorkHoursForm employeeId={employee.id} employeeName={employee.name} />
            </CardContent>
          </Card>

          {/* Entries */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Entries</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{totalEntries} total entries</p>
                </div>
              </CardHeader>
              <CardContent>
                <WorkHoursList workHours={workHours} role={role} />
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  {currentPage > 1 ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/work-hours?page=${currentPage - 1}`}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                  )}
                  {currentPage < totalPages ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/work-hours?page=${currentPage + 1}`}>
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
