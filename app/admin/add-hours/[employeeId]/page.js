import { getServerSession } from 'next-auth'
import { authOptions } from '../../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AdminAddHoursForm from '@/components/AdminAddHoursForm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function AdminAddHoursPage({ params }) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const { employeeId } = await params
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } })

  if (!employee) {
    return <div className="p-8 text-center">Employee not found</div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link href={`/admin/employee/${employee.id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to {employee.fullName || employee.name}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Add Work Hours</CardTitle>
          <CardDescription>For: {employee.fullName || employee.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminAddHoursForm employee={employee} />
        </CardContent>
      </Card>
    </div>
  )
}
