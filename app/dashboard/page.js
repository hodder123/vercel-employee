import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import LogoutButton from '@/components/LogoutButton'
import Link from 'next/link'

export default async function DashboardPage() {
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

  const fullName = employee?.fullName || username

  // Get recent work hours
  let workHours = []
  if (employee) {
    workHours = await prisma.workHour.findMany({
      where: { employeeId: employee.id },
      orderBy: { date: 'desc' },
      take: 5
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome, {fullName}</h1>
              <p className="text-sm text-gray-600">
                {role === 'admin' ? 'Administrator' : 'Employee'}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/work-hours" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border-2 border-transparent hover:border-blue-500">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Work Hours</h3>
                <p className="text-sm text-gray-600">Log your time</p>
              </div>
            </div>
          </Link>

          <Link href="/edit-profile" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border-2 border-transparent hover:border-green-500">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">My Profile</h3>
                <p className="text-sm text-gray-600">Edit details</p>
              </div>
            </div>
          </Link>

          {role === 'admin' && (
            <Link href="/admin/all-work-hours" className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition border-2 border-transparent hover:border-purple-500">
              <div className="flex items-center space-x-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Admin Panel</h3>
                  <p className="text-sm text-gray-600">Manage all hours</p>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Recent Hours */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Hours</h2>
          {workHours.length === 0 ? (
            <p className="text-gray-600">No hours logged yet.</p>
          ) : (
            <div className="space-y-3">
              {workHours.map((entry) => (
                <div key={entry.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{new Date(entry.date).toLocaleDateString()}</p>
                    <p className="text-sm text-gray-600">{entry.description || 'No description'}</p>
                  </div>
                  <span className="text-lg font-semibold text-blue-600">{entry.hoursWorked}h</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}