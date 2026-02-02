import { getServerSession } from 'next-auth'
import { authOptions } from '../../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DeleteUserConfirm from '@/components/DeleteUserConfirm'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function DeleteUserPage({ params }) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const { id } = await params
  const employee = await prisma.employee.findUnique({
    where: { id: id },
    include: { workHours: { select: { id: true } } }
  })

  if (!employee) {
    return <div className="p-8 text-center">Employee not found</div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link href={`/admin/employee/${employee.id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Cancel
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Delete User</CardTitle>
          <CardDescription>Permanently remove employee account</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteUserConfirm employee={employee} workHoursCount={employee.workHours.length} />
        </CardContent>
      </Card>
    </div>
  )
}
