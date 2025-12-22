import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import WorkHoursForm from '@/components/WorkHoursForm'
import WorkHoursList from '@/components/WorkHoursList'

export default async function WorkHoursPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  const username = session.user.name
  const role = session.user.role

  // Get employee info
  const employee = await prisma.employee.findUnique({
    where: { name: username }
  })

  if (!employee) {
    return <div>Employee not found</div>
  }

  // Get work hours for this employee (last 30 entries)
  const workHours = await prisma.workHour.findMany({
    where: { employeeId: employee.id },
    orderBy: { date: 'desc' },
    take: 30
  })

return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Log Work Hours</h1>
            <a href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {role === 'admin' ? (
          // Admin view - can only see their hours, not log new ones
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-2">Admin Notice</h2>
              <p className="text-blue-800">
                As an administrator, you cannot log work hours for yourself. 
                You can view and manage all employee hours from the Admin Panel.
              </p>
              <a 
                href="/admin/all-work-hours" 
                className="inline-block mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
              >
                Go to Admin Panel
              </a>
            </div>

            {/* Show admin's own hours if they have any */}
            {workHours.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Your Hours</h2>
                <WorkHoursList workHours={workHours} role={role} />
              </div>
            )}
          </div>
        ) : (
          // Regular employee view - can log hours
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Log Hours Form */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Entry</h2>
              <WorkHoursForm employeeId={employee.id} employeeName={employee.name} />
            </div>

            {/* Recent Hours List */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Entries</h2>
              <WorkHoursList workHours={workHours} role={role} />
            </div>
          </div>
        )}
      </main>
    </div>
  )}