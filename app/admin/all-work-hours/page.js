import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, FileText, Clock, CalendarDays, Plus, ChevronRight } from 'lucide-react'

export default async function AdminAllWorkHoursPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const allEmployees = await prisma.employee.findMany({
    where: { id: { not: '0' } },
    include: {
      workHours: {
        select: { id: true, hoursWorked: true, date: true }
      }
    }
  })

  const now = new Date()
  const pstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const dayOfWeek = pstDate.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(pstDate)
  weekStart.setDate(weekStart.getDate() - mondayOffset)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  const lastWeekStart = new Date(weekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(weekStart)
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)
  lastWeekEnd.setHours(23, 59, 59, 999)

  const priorityEmployees = ['Oct-1071', 'Mar-3198', 'Jan-0161']
  const employees = allEmployees.sort((a, b) => {
    const aIsPriority = priorityEmployees.includes(a.id)
    const bIsPriority = priorityEmployees.includes(b.id)
    if (aIsPriority && !bIsPriority) return 1
    if (!aIsPriority && bIsPriority) return -1
    return (a.fullName || a.name).localeCompare(b.fullName || b.name)
  })

  const employeeStats = employees.map(emp => {
    const totalHours = emp.workHours.reduce((sum, wh) => sum + wh.hoursWorked, 0)
    const entriesCount = emp.workHours.length
    const hoursThisWeek = emp.workHours.reduce((sum, wh) => {
      const whDate = new Date(wh.date)
      if (whDate >= weekStart && whDate <= weekEnd) {
        return sum + wh.hoursWorked
      }
      return sum
    }, 0)
    const hoursLastWeek = emp.workHours.reduce((sum, wh) => {
      const whDate = new Date(wh.date)
      if (whDate >= lastWeekStart && whDate <= lastWeekEnd) {
        return sum + wh.hoursWorked
      }
      return sum
    }, 0)
    const lastEntry = emp.workHours.length > 0
      ? emp.workHours.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date
      : null
    return { ...emp, totalHours, entriesCount, hoursThisWeek, hoursLastWeek, lastEntry }
  })

  const totalSystemHours = employeeStats.reduce((sum, emp) => sum + emp.totalHours, 0)
  const totalThisWeekHours = employeeStats.reduce((sum, emp) => sum + emp.hoursThisWeek, 0)
  const totalLastWeekHours = employeeStats.reduce((sum, emp) => sum + emp.hoursLastWeek, 0)
  const totalEntries = employeeStats.reduce((sum, emp) => sum + emp.entriesCount, 0)
  const topThisWeek = [...employeeStats]
    .sort((a, b) => b.hoursThisWeek - a.hoursThisWeek)
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">{employees.length} users &middot; {totalEntries} total entries</p>
        </div>
        <Button asChild>
          <Link href="/admin/add-user">
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">This Week Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalThisWeekHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Last Week Hours</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalLastWeekHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEntries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">All Time Hours</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalSystemHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick View: This Week</CardTitle>
        </CardHeader>
        <CardContent>
          {topThisWeek.length === 0 ? (
            <p className="text-muted-foreground">No hours logged this week.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topThisWeek.map((employee) => (
                <Link
                  key={employee.id}
                  href={`/admin/employee/${employee.id}`}
                  className="rounded-lg border bg-white/80 p-3 hover:shadow-sm transition-shadow"
                >
                  <p className="font-semibold truncate">{employee.fullName || employee.name}</p>
                  <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
                    <span>{employee.entriesCount} entries</span>
                    <span className="font-semibold text-blue-700">{employee.hoursThisWeek.toFixed(1)}h</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {employeeStats.map((employee) => (
              <Link
                key={employee.id}
                href={`/admin/employee/${employee.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-700 font-semibold text-sm">
                      {employee.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'NA'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{employee.fullName || employee.name}</p>
                    <p className="text-sm text-muted-foreground truncate">@{employee.name} &middot; {employee.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
                  <div className="text-center hidden sm:block">
                    <p className="text-xs text-muted-foreground">Entries</p>
                    <p className="font-semibold">{employee.entriesCount}</p>
                  </div>
                  <div className="text-center hidden md:block">
                    <p className="text-xs text-muted-foreground">This Week</p>
                    <p className="font-semibold text-blue-700">{employee.hoursThisWeek.toFixed(1)}</p>
                  </div>
                  <div className="text-center hidden lg:block">
                    <p className="text-xs text-muted-foreground">Last Week</p>
                    <p className="font-semibold text-emerald-700">{employee.hoursLastWeek.toFixed(1)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Hours</p>
                    <p className="font-semibold text-blue-600">{employee.totalHours.toFixed(1)}</p>
                  </div>
                  {employee.lastEntry && (
                    <div className="text-center hidden md:block">
                      <p className="text-xs text-muted-foreground">Last Entry</p>
                      <p className="text-sm font-medium">
                        {new Date(employee.lastEntry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' })}
                      </p>
                    </div>
                  )}
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
