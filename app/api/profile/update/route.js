import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sanitizeObject } from '@/lib/sanitize'

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const sanitizedData = sanitizeObject(body)

    const username = session.user.name

    // Update employee profile
    const updated = await prisma.employee.update({
      where: { name: username },
      data: {
        fullName: sanitizedData.fullName,
        email: sanitizedData.email || null,
        dob: sanitizedData.dob || null,
        pronouns: sanitizedData.pronouns || null,
        department: sanitizedData.department || null,
        title: sanitizedData.title || null,
        tshirtSize: sanitizedData.tshirtSize || null,
        emergencyContactName: sanitizedData.emergencyContactName || null,
        emergencyContactPhone: sanitizedData.emergencyContactPhone || null
      }
    })

    return NextResponse.json({ success: true, employee: updated })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile: ' + error.message },
      { status: 500 }
    )
  }
}