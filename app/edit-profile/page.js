import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import EditProfileForm from '@/components/EditProfileForm'

export default async function EditProfilePage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  const username = session.user.name

  // Get employee info
  const employee = await prisma.employee.findUnique({
    where: { name: username }
  })

  if (!employee) {
    return <div className="p-8 text-center">Employee profile not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Profile</h1>
            <a 
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <EditProfileForm employee={employee} />
        </div>
      </main>
    </div>
  )
}