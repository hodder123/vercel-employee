import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get employee to find username
    const employee = await prisma.employee.findUnique({
      where: { id: id }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Prevent deleting yourself
    if (employee.name === session.user.name) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Delete in order: WorkHours -> Employee -> User
    // First delete all work hours for this employee
    await prisma.workHour.deleteMany({
      where: { employeeId: id }
    })

    // Delete employee record
    await prisma.employee.delete({
      where: { id: id }
    })

    // Delete user account
    await prisma.user.delete({
      where: { username: employee.name }
    })

    return NextResponse.json({ 
      success: true,
      message: 'User deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user: ' + error.message },
      { status: 500 }
    )
  }
}