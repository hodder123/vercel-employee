import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import clients from '@/scripts/data/setmore-clients.json'
import jobLinks from '@/scripts/data/setmore-job-links.json'

// TEMPORARY. Remove after use.
const SECRET = 'b47e2c9910a4f8e6d3215a9fb6e0c74188d2f5a0b1e3c9d7'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fixJobId = searchParams.get('fixJobId')
  const fixClientName = searchParams.get('fixClientName')
  if (fixJobId && fixClientName) {
    const client = await prisma.client.findFirst({ where: { name: fixClientName } })
    if (!client) {
      return NextResponse.json({ ok: false, error: 'client not found', fixClientName }, { status: 404 })
    }
    const job = await prisma.projectName.update({
      where: { id: Number(fixJobId) },
      data: { clientId: client.id },
    })
    return NextResponse.json({ ok: true, fixed: true, jobId: job.id, jobName: job.name, clientId: client.id, clientName: client.name })
  }

  try {
    const nameToId = new Map()
    let clientsCreated = 0

    for (const c of clients) {
      const created = await prisma.client.create({
        data: {
          name: c.name,
          email: c.email || null,
          phone: c.phone || null,
          phone2: c.phone2 || null,
          phone3: c.phone3 || null,
          company: c.company || null,
          address: c.address || null,
          notes: c.notes || null,
          source: 'setmore_import',
        },
      })
      clientsCreated++
      nameToId.set(c.name, created.id)
    }

    let jobsLinked = 0
    const skipped = []

    for (const link of jobLinks) {
      const clientId = nameToId.get(link.matchedClient)
      if (!clientId) {
        skipped.push({ ...link, reason: 'client not found' })
        continue
      }
      const job = await prisma.projectName.findUnique({ where: { name: link.jobName } })
      if (!job) {
        skipped.push({ ...link, reason: 'job not found' })
        continue
      }
      await prisma.projectName.update({
        where: { id: job.id },
        data: { clientId },
      })
      jobsLinked++
    }

    return NextResponse.json({
      ok: true,
      clientsCreated,
      jobsLinked,
      skippedCount: skipped.length,
      skipped,
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
