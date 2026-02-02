import { getServerSession } from 'next-auth'
import { authOptions } from '../../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import EmployeeHoursDetail from '@/components/EmployeeHoursDetail'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, KeyRound, Trash2, ArrowLeft } from 'lucide-react'

export default async function EmployeeDetailPage({ params }) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  const { id } = await params

  const employee = await prisma.employee.findUnique({
    where: { id: id },
    include: {
      workHours: { orderBy: { date: 'desc' } }
    }
  })

  if (!employee) {
    return <div className="p-8 text-center">Employee not found</div>
  }

  const totalHours = employee.workHours.reduce((sum, wh) => sum + wh.hoursWorked, 0)

  return (
    <div className="space-y-6">
      <Link href="/admin/all-work-hours" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Employees
      </Link>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-700 font-bold text-lg">
                  {employee.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'NA'}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold">{employee.fullName || employee.name}</h1>
                <p className="text-sm text-muted-foreground">@{employee.name} &middot; ID: {employee.id}</p>
                <div className="flex gap-2 mt-1.5">
                  <Badge variant="info">{employee.workHours.length} entries</Badge>
                  <Badge variant="success">{totalHours.toFixed(1)}h total</Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" className="bg-green-600 hover:bg-green-700" asChild>
                <Link href={`/admin/add-hours/${employee.id}`}>
                  <Plus className="h-4 w-4 mr-1" /> Add Hours
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/admin/change-password/${employee.id}`}>
                  <KeyRound className="h-4 w-4 mr-1" /> Password
                </Link>
              </Button>
              <Button size="sm" variant="destructive" asChild>
                <Link href={`/admin/delete-user/${employee.id}`}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <EmployeeHoursDetail employee={employee} workHours={employee.workHours} />
    </div>
  )
}
