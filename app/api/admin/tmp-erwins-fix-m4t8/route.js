import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// TEMPORARY. Remove after use.
const SECRET = 'c6b2e9f04a7d1385f6c0e9a2b7d4f1385a0c6e9b2'

const CANONICAL = "Erwin's Bakery"
const OLD_NAMES = ['Irwin’s bakery', 'Cooler Erwins']
const JOB_ID = 86

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const allHours = await prisma.workHour.findMany({
      select: { id: true, projects: true },
    })

    let rowsUpdated = 0
    const entryRenameCounts = {}

    for (const row of allHours) {
      if (!row.projects) continue
      let arr
      try {
        arr = JSON.parse(row.projects)
      } catch {
        continue
      }
      if (!Array.isArray(arr)) continue

      let changed = false
      for (const entry of arr) {
        if (entry && typeof entry.name === 'string' && OLD_NAMES.includes(entry.name)) {
          const oldName = entry.name
          entry.name = CANONICAL
          changed = true
          entryRenameCounts[oldName] = (entryRenameCounts[oldName] || 0) + 1
        }
      }

      if (changed) {
        await prisma.workHour.update({
          where: { id: row.id },
          data: { projects: JSON.stringify(arr) },
        })
        rowsUpdated++
      }
    }

    const job = await prisma.projectName.update({
      where: { id: JOB_ID },
      data: { name: CANONICAL },
    })

    return NextResponse.json({
      ok: true,
      hoursRowsScanned: allHours.length,
      hoursRowsUpdated: rowsUpdated,
      entryRenameCounts,
      job: { id: job.id, name: job.name },
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
