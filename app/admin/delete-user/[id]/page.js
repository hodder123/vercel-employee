import { getServerSession } from 'next-auth'
import { authOptions } from '../../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DeleteUserConfirm from '@/components/DeleteUserConfirm'

export default async function DeleteUserPage({ params }) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const { id } = await params

  // Get employee with work hours count
  const employee = await prisma.employee.findUnique({
    where: { id: id },
    include: {
      workHours: {
        select: { id: true }
      }
    }
  })

  if (!employee) {
    return <div className="p-8 text-center">Employee not found</div>
  }

  const workHoursCount = employee.workHours.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-red-900">Delete User</h1>
              <p className="text-sm text-gray-600 mt-1">Permanently remove employee account</p>
            </div>
            <a 
              href={`/admin/employee/${employee.id}`}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              ← Cancel
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <DeleteUserConfirm employee={employee} workHoursCount={workHoursCount} />
        </div>
      </main>
    </div>
  )
}