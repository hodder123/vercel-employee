import { getServerSession } from 'next-auth'
import { authOptions } from '../../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import EditHoursForm from '@/components/EditHoursForm'

export default async function EditHoursPage({ params }) {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const { id } = await params

  // Get work hour entry
  const workHour = await prisma.workHour.findUnique({
    where: { id: parseInt(id) },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          fullName: true
        }
      }
    }
  })

  if (!workHour) {
    return <div className="p-8 text-center">Work hour entry not found</div>
  }

  const parseProjects = (projects) => {
    try {
      if (typeof projects === 'string') {
        return JSON.parse(projects)
      }
      return projects || []
    } catch {
      return []
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Work Hours</h1>
              <p className="text-sm text-gray-600 mt-1">
                {workHour.employee?.fullName || workHour.employee?.name} • {new Date(workHour.date).toLocaleDateString()}
              </p>
            </div>
            <a 
              href={`/admin/employee/${workHour.employeeId}`}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              ← Back to Employee
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <EditHoursForm 
            workHour={{
              ...workHour,
              projects: parseProjects(workHour.projects)
            }} 
          />
        </div>
      </main>
    </div>
  )
}