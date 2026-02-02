import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Clock, AlertTriangle, CalendarDays } from 'lucide-react'
import DashboardCharts from '@/components/admin/DashboardCharts'

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get current date in PST
  const now = new Date()
  const pstDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const todayStr = pstDate.toISOString().split('T')[0]

  // Start of this week (Monday)
  const dayOfWeek = pstDate.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(pstDate)
  weekStart.setDate(weekStart.getDate() - mondayOffset)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  // Start of this month
  const monthStart = new Date(pstDate.getFullYear(), pstDate.getMonth(), 1)

  // Fetch all employees (exclude admin with id '0')
  const employees = await prisma.employee.findMany({
    where: { id: { not: '0' } },
    include: {
      workHours: {
        orderBy: { date: 'desc' }
      }
    }
  })

  // Calculate stats
  const totalEmployees = employees.length

  let totalHoursThisWeek = 0
  let totalHoursThisMonth = 0
  const employeesLoggedToday = new Set()
  const dailyHoursMap = {}
  const weeklyEmployeeMap = new Map()

  // Last 14 days for daily trend
  for (let i = 13; i >= 0; i--) {
    const d = new Date(pstDate)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    dailyHoursMap[key] = 0
  }

  employees.forEach(emp => {
    weeklyEmployeeMap.set(emp.id, {
      id: emp.id,
      name: emp.name,
      fullName: emp.fullName,
      hours: 0,
      entries: 0
    })
    emp.workHours.forEach(wh => {
      const whDate = new Date(wh.date)
      const whDateStr = whDate.toISOString().split('T')[0]

      // This week
      if (whDate >= weekStart && whDate <= weekEnd) {
        totalHoursThisWeek += wh.hoursWorked
        const entry = weeklyEmployeeMap.get(emp.id)
        if (entry) {
          entry.hours += wh.hoursWorked
          entry.entries += 1
        }
      }

      // This month
      if (whDate >= monthStart) {
        totalHoursThisMonth += wh.hoursWorked
      }

      // Today
      if (whDateStr === todayStr) {
        employeesLoggedToday.add(emp.id)
      }

      // Daily trend (last 14 days)
      if (whDateStr in dailyHoursMap) {
        dailyHoursMap[whDateStr] += wh.hoursWorked
      }

    })
  })

  const notLoggedToday = employees.filter(emp => !employeesLoggedToday.has(emp.id))

  // Prepare chart data
  const dailyTrend = Object.entries(dailyHoursMap).map(([date, hours]) => ({
    date,
    label: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    hours: Math.round(hours * 10) / 10
  }))

  const weeklyEmployees = Array.from(weeklyEmployeeMap.values())
    .sort((a, b) => b.hours - a.hours)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Payroll-first view of hours, entries, and activity</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Hours This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalHoursThisWeek.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Hours This Month</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHoursThisMonth.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Not Logged Today</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{notLoggedToday.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <DashboardCharts dailyTrend={dailyTrend} weeklyEmployees={weeklyEmployees} />

      <div className="flex justify-end">
        <Link
          href="/admin/all-work-hours"
          className="text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          View full payroll list
        </Link>
      </div>

      {/* Not logged today */}
      {notLoggedToday.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Employees Who Haven&apos;t Logged Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {notLoggedToday.map(emp => (
                <Badge key={emp.id} variant="warning">
                  {emp.fullName || emp.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
