import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { username, password, employeeId, fullName, email, role } = await request.json()

    // Validate
    if (!username || !password || !employeeId || !fullName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
    }

    // Check if employee ID already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: employeeId }
    })

    if (existingEmployee) {
      return NextResponse.json({ error: 'Employee ID already exists' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        password: hashedPassword,
        role: role || 'user'
      }
    })

    // Create employee record
    const employee = await prisma.employee.create({
      data: {
        id: employeeId,
        name: username.toLowerCase(),
        fullName: fullName,
        email: email || null
      }
    })

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        fullName: employee.fullName
      }
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user: ' + error.message },
      { status: 500 }
    )
  }
}