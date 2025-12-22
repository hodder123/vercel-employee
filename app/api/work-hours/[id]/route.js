import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sanitizeObject } from '@/lib/sanitize'

// UPDATE work hours
export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { date } = body
    const projects = sanitizeObject(body.projects)

    // Get the work hour entry
    const workHour = await prisma.workHour.findUnique({
      where: { id: parseInt(id) },
      include: { employee: true }
    })

    if (!workHour) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Check permissions
    const isAdmin = session.user.role === 'admin'
    const isOwner = workHour.employee.name === session.user.name

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // For non-admins, check 12-hour edit window
    if (!isAdmin) {
      const createdAt = workHour.createdAt
      const now = new Date()
      const hoursSinceCreation = (now - new Date(createdAt)) / (1000 * 60 * 60)

      if (hoursSinceCreation > 12) {
        return NextResponse.json({ 
          error: 'Edit window expired. You can only edit entries within 12 hours of creation.' 
        }, { status: 403 })
      }
    }

    const totalHours = projects.reduce((sum, p) => sum + (parseFloat(p.hours) || 0), 0)

    const updated = await prisma.workHour.update({
      where: { id: parseInt(id) },
      data: {
        date: new Date(date),
        projects: JSON.stringify(projects),
        hoursWorked: totalHours,
        description: projects.map(p => `${p.name}: ${p.description || 'N/A'}`).join('; ')
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating work hours:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

// DELETE work hours
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await prisma.workHour.delete({
      where: { id: parseInt(id) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting work hours:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}