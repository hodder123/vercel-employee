import { put } from '@vercel/blob'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const MAX_SIZE_BYTES = 15 * 1024 * 1024 // 15 MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'application/pdf',
]

// List receipts for a job
export async function GET(request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectId = parseInt(searchParams.get('projectId'))
  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  const receipts = await prisma.receipt.findMany({
    where: { projectId },
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(receipts)
}

// Upload + tag a receipt/invoice to a job
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const projectId = parseInt(formData.get('projectId'))
    const vendor = formData.get('vendor') || null
    const amountRaw = formData.get('amount')
    const amount = amountRaw ? parseFloat(amountRaw) : null
    const dateRaw = formData.get('date')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only image or PDF files are allowed' }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large — max 15 MB' }, { status: 400 })
    }

    const project = await prisma.projectName.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const timestamp = Date.now()
    const ext = (file.name && file.name.split('.').pop()) || (file.type === 'application/pdf' ? 'pdf' : 'jpg')
    const pathname = `receipts/${projectId}/${timestamp}.${ext}`

    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
    })

    const receipt = await prisma.receipt.create({
      data: {
        projectId,
        vendor,
        amount: Number.isFinite(amount) ? amount : null,
        date: dateRaw ? new Date(dateRaw + 'T12:00:00-08:00') : null,
        fileUrl: blob.url,
        fileType: file.type,
        fileName: file.name || null,
        uploadedBy: session.user.name,
      },
    })

    return NextResponse.json(receipt)
  } catch (error) {
    console.error('Receipt upload error:', error)
    return NextResponse.json({ error: 'Upload failed: ' + error.message }, { status: 500 })
  }
}
