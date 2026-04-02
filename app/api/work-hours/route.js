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
    const { employeeId, date, signature, photos, latitude, longitude, locationName } = body
    const projects = sanitizeObject(body.projects)

    // Validate required fields
    if (!employeeId || !date || !projects || projects.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // SERVER-SIDE DATE VALIDATION — only today or yesterday in PST
    const todayPST = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
    const yesterdayDate = new Date(todayPST)
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayPST = yesterdayDate.toISOString().split('T')[0]

    if (date !== todayPST && date !== yesterdayPST) {
      return NextResponse.json({
        error: 'You can only log hours for today or yesterday'
      }, { status: 400 })
    }

    // Calculate total hours
    const totalHours = projects.reduce((sum, p) => sum + (parseFloat(p.hours) || 0), 0)

    // Sanitize optional fields
    const photosJson = Array.isArray(photos) && photos.length > 0
      ? JSON.stringify(photos)
      : null
    const lat = typeof latitude === 'number' ? latitude : null
    const lng = typeof longitude === 'number' ? longitude : null
    const locName = typeof locationName === 'string' ? locationName.slice(0, 500) : null

    // Check if an entry already exists for this date
    const existing = await prisma.workHour.findFirst({
      where: {
        employeeId: employeeId,
        date: new Date(date + 'T12:00:00-08:00')
      }
    })

    if (existing) {
      // Merge new projects into the existing entry
      const existingProjects = typeof existing.projects === 'string'
        ? JSON.parse(existing.projects)
        : existing.projects || []

      const existingPhotos = existing.photos
        ? JSON.parse(existing.photos)
        : []

      const updatedProjects = [...existingProjects, ...projects]
      const updatedPhotos = [...existingPhotos, ...(Array.isArray(photos) ? photos : [])]
      const newTotalHours = updatedProjects.reduce((sum, p) => sum + (parseFloat(p.hours) || 0), 0)

      const updated = await prisma.workHour.update({
        where: { id: existing.id },
        data: {
          projects: JSON.stringify(updatedProjects),
          hoursWorked: newTotalHours,
          description: updatedProjects.map(p => `${p.name}: ${p.description || 'N/A'}`).join('; '),
          photos: updatedPhotos.length > 0 ? JSON.stringify(updatedPhotos) : existing.photos,
          // Only update location if not already set
          latitude: existing.latitude ?? lat,
          longitude: existing.longitude ?? lng,
          locationName: existing.locationName ?? locName,
        }
      })

      return NextResponse.json(updated)
    } else {
      // Create new entry
      const newEntry = await prisma.workHour.create({
        data: {
          employeeId: employeeId,
          date: new Date(date + 'T12:00:00-08:00'),
          projects: JSON.stringify(projects),
          hoursWorked: totalHours,
          description: projects.map(p => `${p.name}: ${p.description || 'N/A'}`).join('; '),
          signature: signature || null,
          photos: photosJson,
          latitude: lat,
          longitude: lng,
          locationName: locName,
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
