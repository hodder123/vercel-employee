import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sanitizeObject } from '@/lib/sanitize'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { employeeId, date, signature } = body
    const projects = sanitizeObject(body.projects)

    // Validate
    if (!employeeId || !date || !projects || projects.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // SERVER-SIDE DATE VALIDATION - Only today or yesterday
    const submittedDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    submittedDate.setHours(0, 0, 0, 0)

    if (submittedDate < yesterday || submittedDate > today) {
      return NextResponse.json({ 
        error: 'You can only log hours for today or yesterday' 
      }, { status: 400 })
    }

    // Calculate total hours
    const totalHours = projects.reduce((sum, p) => sum + (parseFloat(p.hours) || 0), 0)

    // Check if entry already exists for this date
    const existing = await prisma.workHour.findFirst({
      where: {
        employeeId: employeeId,
        date: new Date(date + 'T12:00:00-08:00') // FIXED: Use noon PST
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
          description: updatedProjects.map(p => `${p.name}: ${p.description || 'N/A'}`).join('; ')
        }
      })

      return NextResponse.json(updated)
    } else {
      // Create new entry
      const newEntry = await prisma.workHour.create({
        data: {
          employeeId: employeeId,
          date: new Date(date + 'T12:00:00-08:00'), // FIXED: Use noon PST
          projects: JSON.stringify(projects),
          hoursWorked: totalHours,
          description: projects.map(p => `${p.name}: ${p.description || 'N/A'}`).join('; '),
          signature: signature || null
        }
      })

      return NextResponse.json(newEntry)
    }
  } catch (error) {
    console.error('Error logging work hours:', error)
    return NextResponse.json(
      { error: 'Failed to log work hours: ' + error.message },
      { status: 500 }
    )
  }
}