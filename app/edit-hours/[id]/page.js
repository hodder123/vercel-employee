import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import UserEditHoursForm from '@/components/UserEditHoursForm'

export default async function UserEditHoursPage({ params }) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
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

  // Check if user owns this entry
  if (workHour.employee.name !== session.user.name) {
    return <div className="p-8 text-center text-red-600">You can only edit your own entries</div>
  }

  // Check if within 12-hour edit window
  const createdAt = new Date(workHour.createdAt)
  const now = new Date()
  const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60)

  if (hoursSinceCreation > 12) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-red-600 mb-4">Edit Window Expired</h2>
          <p className="text-gray-700 mb-4">
            You can only edit entries within 12 hours of creation. This entry was created {hoursSinceCreation.toFixed(1)} hours ago.
          </p>
          <a href="/work-hours" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Work Hours
          </a>
        </div>
      </div>
    )
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

  const timeRemaining = Math.max(0, 12 - hoursSinceCreation)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Work Hours</h1>
              <p className="text-sm text-gray-600 mt-1">
                {new Date(workHour.date).toLocaleDateString()} • {timeRemaining.toFixed(1)} hours left to edit
              </p>
            </div>
            <a 
              href="/work-hours"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              ← Back to Work Hours
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <UserEditHoursForm 
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