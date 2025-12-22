import { getServerSession } from 'next-auth'
import { authOptions } from '../../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import EmployeeHoursDetail from '@/components/EmployeeHoursDetail'

export default async function EmployeeDetailPage({ params }) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const { id } = await params

  // Get employee with all work hours
  const employee = await prisma.employee.findUnique({
    where: { id: id },
    include: {
      workHours: {
        orderBy: { date: 'desc' }
      }
    }
  })

  if (!employee) {
    return <div>Employee not found</div>
  }

  const totalHours = employee.workHours.reduce((sum, wh) => sum + wh.hoursWorked, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 font-semibold text-lg">
                    {employee.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'NA'}
                  </span>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{employee.fullName || employee.name}</h1>
                  <p className="text-sm text-gray-600">@{employee.name} • ID: {employee.id}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-gray-600">
                  <span className="font-medium text-gray-900">{employee.workHours.length}</span> entries
                </span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-600">
                  <span className="font-medium text-blue-600">{totalHours.toFixed(1)}h</span> total
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link 
                href={`/admin/add-hours/${employee.id}`}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
              >
                + Add Hours
              </Link>
              <Link 
                href={`/admin/change-password/${employee.id}`}
                className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition"
              >
                Change Password
              </Link>
              <Link 
                href={`/admin/delete-user/${employee.id}`}
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
              >
                Delete User
              </Link>
              <Link 
                href="/admin/all-work-hours" 
                className="text-blue-600 hover:text-blue-700 font-medium text-sm whitespace-nowrap self-center"
              >
                ← Back
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <EmployeeHoursDetail employee={employee} workHours={employee.workHours} />
      </main>
    </div>
  )
}