import { getServerSession } from 'next-auth'
import { authOptions } from '../../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AdminAddHoursForm from '@/components/AdminAddHoursForm'

export default async function AdminAddHoursPage({ params }) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const { employeeId } = await params

  // Get employee info
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId }
  })

  if (!employee) {
    return <div className="p-8 text-center">Employee not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Add Work Hours</h1>
              <p className="text-sm text-gray-600 mt-1">
                For: {employee.fullName || employee.name}
              </p>
            </div>
            <a 
              href={`/admin/employee/${employee.id}`}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              ← Back to Employee
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <AdminAddHoursForm employee={employee} />
        </div>
      </main>
    </div>
  )
}