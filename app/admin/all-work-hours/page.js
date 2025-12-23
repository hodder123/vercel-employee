import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AllWorkHoursDashboard from '@/components/AllWorkHoursDashboard'

export default async function AllWorkHoursPage({ searchParams }) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { username: session.user.name }
  })

  if (user?.role !== 'admin') {
    redirect('/dashboard')
  }

  // Get time filter from URL (defaults to 7 days)
  const period = searchParams.period || '7'
  
  // Calculate date range
  const now = new Date()
  let startDate = new Date()
  
  if (period === '7') {
    startDate.setDate(now.getDate() - 7)
  } else if (period === '30') {
    startDate.setDate(now.getDate() - 30)
  } else if (period === 'all') {
    startDate = new Date(2020, 0, 1) // Far back enough
  }

  // Fetch all employees with their hours for the period
  const employees = await prisma.employee.findMany({
    where: {
      name: { not: 'admin' } // Exclude admin
    },
    include: {
      workHours: {
        where: {
          date: {
            gte: startDate,
            lte: now
          }
        },
        orderBy: {
          date: 'desc'
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  })

  // Calculate summary stats
  const totalHours = employees.reduce((sum, emp) => 
    sum + emp.workHours.reduce((empSum, wh) => empSum + wh.hoursWorked, 0), 0
  )
  
  const totalEntries = employees.reduce((sum, emp) => sum + emp.workHours.length, 0)
  
  const activeEmployees = employees.filter(emp => emp.workHours.length > 0).length

  // Calculate average hours per employee
  const avgHoursPerEmployee = activeEmployees > 0 ? (totalHours / activeEmployees).toFixed(1) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Work Hours Dashboard
              </h1>
              <p className="text-slate-600 mt-1">Comprehensive employee time tracking analytics</p>
            </div>
            <a 
              href="/dashboard"
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-all hover:shadow-md"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AllWorkHoursDashboard 
          employees={employees}
          totalHours={totalHours}
          totalEntries={totalEntries}
          activeEmployees={activeEmployees}
          avgHoursPerEmployee={avgHoursPerEmployee}
          currentPeriod={period}
        />
      </main>
    </div>
  )
}