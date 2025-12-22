import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import AddUserForm from '@/components/AddUserForm'

export default async function AdminAddUserPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Add New User</h1>
              <p className="text-sm text-gray-600 mt-1">Create a new employee account</p>
            </div>
            <a 
              href="/admin/all-work-hours"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              ← Back to All Employees
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <AddUserForm />
        </div>
      </main>
    </div>
  )
}