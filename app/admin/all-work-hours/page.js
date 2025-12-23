import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function AdminAllWorkHoursPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

// Get all employees with their work hours count (exclude admin)
  const allEmployees = await prisma.employee.findMany({
    where: {
      id: { not: '0' } // Exclude administrator
    },
    include: {
      workHours: {
        select: {
          id: true,
          hoursWorked: true,
          date: true
        }
      }
    }
  })

  // Sort: Move Carrie, Kenzie, and Mark to bottom
  const priorityEmployees = ['Oct-1071', 'Mar-3198', 'Jan-0161'] // Carrie, Kenzie, Mark
  const employees = allEmployees.sort((a, b) => {
    const aIsPriority = priorityEmployees.includes(a.id)
    const bIsPriority = priorityEmployees.includes(b.id)
    
    if (aIsPriority && !bIsPriority) return 1
    if (!aIsPriority && bIsPriority) return -1
    
    // Both same priority level, sort by full name
    return (a.fullName || a.name).localeCompare(b.fullName || b.name)
  })

  // Calculate stats for each employee
  const employeeStats = employees.map(emp => {
    const totalHours = emp.workHours.reduce((sum, wh) => sum + wh.hoursWorked, 0)
    const entriesCount = emp.workHours.length
    const lastEntry = emp.workHours.length > 0 
      ? emp.workHours.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date
      : null

    return {
      ...emp,
      totalHours,
      entriesCount,
      lastEntry
    }
  })

  const totalSystemHours = employeeStats.reduce((sum, emp) => sum + emp.totalHours, 0)
  const totalEntries = employeeStats.reduce((sum, emp) => sum + emp.entriesCount, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Hours Management</h1>
              <p className="text-sm text-gray-600 mt-1">{employees.length} employees • {totalEntries} total entries</p>
            </div>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-600">Total Employees</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{employees.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-600">Total Entries</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{totalEntries}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-600">Total Hours</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-2">{totalSystemHours.toFixed(1)}h</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-600">Avg per Employee</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-2">
              {employees.length > 0 ? (totalSystemHours / employees.length).toFixed(1) : 0}h
            </p>
          </div>
        </div>

        {/* Employee Cards */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">All Employees</h2>
            <Link
              href="/admin/add-user"
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
            >
              + Add User
            </Link>
          </div>

          <div className="divide-y divide-gray-200">
            {employeeStats.map((employee) => (
              <Link
                key={employee.id}
                href={`/admin/employee/${employee.id}`}
                className="block hover:bg-gray-50 transition"
              >
                <div className="px-4 sm:px-6 py-4 sm:py-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    {/* Employee Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-700 font-semibold text-sm sm:text-base">
                            {employee.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'NA'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                            {employee.fullName || employee.name}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">
                            @{employee.name} • ID: {employee.id}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Entries</p>
                        <p className="text-base sm:text-lg font-semibold text-gray-900">{employee.entriesCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Total Hours</p>
                        <p className="text-base sm:text-lg font-semibold text-blue-600">{employee.totalHours.toFixed(1)}h</p>
                      </div>
                      {employee.lastEntry && (
                        <div className="text-center hidden sm:block">
                          <p className="text-xs text-gray-500">Last Entry</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(employee.lastEntry).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      )}
                      <div className="text-gray-400">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}