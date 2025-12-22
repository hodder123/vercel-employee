import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sanitizeObject } from '@/lib/sanitize'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { employeeId, date } = body
    const projects = sanitizeObject(body.projects)

    // Validate
    if (!employeeId || !date || !projects || projects.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Calculate total hours
    const totalHours = projects.reduce((sum, p) => sum + (parseFloat(p.hours) || 0), 0)

    // Check if entry already exists for this date
    const existing = await prisma.workHour.findFirst({
      where: {
        employeeId: employeeId,
        date: new Date(date)
      }
    })

    if (existing) {
      // Update existing entry - add new projects
      const existingProjects = typeof existing.projects === 'string' 
        ? JSON.parse(existing.projects) 
        : existing.projects || []
      
      const updatedProjects = [...existingProjects, ...projects]
      const newTotalHours = updatedProjects.reduce((sum, p) => sum + (parseFloat(p.hours) || 0), 0)

      const updated = await prisma.workHour.update({
        where: { id: existing.id },
        data: {
          projects: JSON.stringify(updatedProjects),
          hoursWorked: newTotalHours,
          description: updatedProjects.map(p => `${p.name}: ${p.description || 'N/A'}`).join('; '),
          signature: 'admin-added'
        }
      })

      return NextResponse.json(updated)
    } else {
      // Create new entry
      const newEntry = await prisma.workHour.create({
        data: {
          employeeId: employeeId,
          date: new Date(date),
          projects: JSON.stringify(projects),
          hoursWorked: totalHours,
          description: projects.map(p => `${p.name}: ${p.description || 'N/A'}`).join('; '),
          signature: 'admin-added'
        }
      })

      return NextResponse.json(newEntry)
    }
  } catch (error) {
    console.error('Error adding work hours:', error)
    return NextResponse.json(
      { error: 'Failed to add work hours: ' + error.message },
      { status: 500 }
    )
  }
}