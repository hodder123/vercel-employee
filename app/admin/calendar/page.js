import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DateTime } from 'luxon'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const REPORT_TIMEZONE = 'America/Los_Angeles'

export default async function AdminCalendarPage({ searchParams }) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const params = await searchParams
  const now = DateTime.now().setZone(REPORT_TIMEZONE)
  const monthParam = params?.month || now.toFormat('yyyy-MM')
  const employeeId = params?.employeeId || 'all'

  let monthStart = DateTime.fromFormat(monthParam, 'yyyy-MM', { zone: REPORT_TIMEZONE }).startOf('month')
  if (!monthStart.isValid) {
    monthStart = now.startOf('month')
  }
  const monthEnd = monthStart.endOf('month')

  const employees = await prisma.employee.findMany({
    where: { id: { not: '0' } },
    orderBy: { fullName: 'asc' }
  })

  const workHours = await prisma.workHour.findMany({
    where: {
      date: {
        gte: monthStart.toJSDate(),
        lte: monthEnd.toJSDate()
      },
      ...(employeeId !== 'all' ? { employeeId } : {})
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          fullName: true
        }
      }
    },
    orderBy: [{ date: 'asc' }]
  })

  const dailyMap = new Map()
  let totalHours = 0

  workHours.forEach((entry) => {
    const entryDate = DateTime.fromJSDate(entry.date).setZone(REPORT_TIMEZONE)
    const key = entryDate.toISODate()
    const existing = dailyMap.get(key) || { total: 0, items: [] }
    existing.total += entry.hoursWorked
    existing.items.push({
      id: entry.id,
      employeeName: entry.employee?.fullName || entry.employee?.name || 'Unknown',
      hours: entry.hoursWorked,
      description: entry.description || 'No description'
    })
    dailyMap.set(key, existing)
    totalHours += entry.hoursWorked
  })

  const daysInMonth = monthStart.daysInMonth
  const firstWeekday = monthStart.weekday % 7 // Sunday = 0
  const leadingBlanks = Array.from({ length: firstWeekday })
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const prevMonth = monthStart.minus({ months: 1 }).toFormat('yyyy-MM')
  const nextMonth = monthStart.plus({ months: 1 }).toFormat('yyyy-MM')

  const selectedEmployee = employees.find((emp) => emp.id === employeeId)
  const headline = selectedEmployee
    ? `Calendar for ${selectedEmployee.fullName || selectedEmployee.name}`
    : 'Calendar for all users'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll Calendar</h1>
          <p className="text-muted-foreground">{headline}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/calendar?month=${prevMonth}&employeeId=${employeeId}`}>Previous</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/calendar?month=${nextMonth}&employeeId=${employeeId}`}>Next</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="month">Month</label>
              <input
                id="month"
                name="month"
                type="month"
                defaultValue={monthStart.toFormat('yyyy-MM')}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="employeeId">User</label>
              <select
                id="employeeId"
                name="employeeId"
                defaultValue={employeeId}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All users</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName || emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full md:w-auto">Apply</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{totalHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workHours.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{monthStart.toFormat('MMMM yyyy')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">User filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{selectedEmployee ? selectedEmployee.fullName || selectedEmployee.name : 'All users'}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 text-xs font-semibold text-slate-600 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="px-2 py-1">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {leadingBlanks.map((_, idx) => (
              <div key={`blank-${idx}`} className="min-h-[120px] rounded-lg border border-dashed border-slate-200 bg-white/40" />
            ))}
            {days.map((day) => {
              const dateKey = monthStart.set({ day }).toISODate()
              const info = dailyMap.get(dateKey)
              const entries = info?.items || []
              const total = info?.total || 0

              return (
                <div key={dateKey} className="min-h-[120px] rounded-lg border border-slate-200 bg-white/80 p-2 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{day}</span>
                    {total > 0 && <Badge variant="info">{total.toFixed(1)}h</Badge>}
                  </div>
                  {entries.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-400">No entries</p>
                  ) : (
                    <div className="mt-2 space-y-1 text-xs text-slate-700">
                      {entries.slice(0, 3).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{entry.employeeName}</span>
                          <span className="font-semibold text-blue-700">{entry.hours}h</span>
                        </div>
                      ))}
                      {entries.length > 3 && (
                        <p className="text-[11px] text-slate-500">+{entries.length - 3} more</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
