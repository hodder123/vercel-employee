import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// TEMPORARY. Remove after use.
const SECRET = 'a3f719c0e8b4d2691f5c7a0e3b9d1f4a8c6e2d709'

// Each merge: rename any WorkHour.projects[].name entry that exactly matches
// one of oldNames to newName, reassign Receipts from deleteJobId to keepJobId,
// optionally rename the surviving ProjectName row, then delete deleteJobId.
const MERGES = [
  { oldNames: ['1927 sunny crest'], newName: '1927 sunnycrest', deleteJobId: 281, keepJobId: 193 },
  { oldNames: ['Palmer 861'], newName: '861 palmer', deleteJobId: 260, keepJobId: 258 },
  { oldNames: ['Tumrun Dalia', 'tamrun dailia'], newName: 'Tamrun Dalia', deleteJobId: 146, keepJobId: 135, renameKeepTo: 'Tamrun Dalia' },
  { oldNames: ['Lourie Bradley'], newName: 'Laurie Bradley', deleteJobId: 332, keepJobId: 326 },
  { oldNames: ['101-1211 Summit Dr'], newName: 'canadian western bank', deleteJobId: 128, keepJobId: 129 },
  { oldNames: ['Erwins'], newName: 'Irwin’s bakery', deleteJobId: 136, keepJobId: 86 },
]

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const allOldNames = new Set()
    for (const m of MERGES) for (const n of m.oldNames) allOldNames.add(n)

    const allHours = await prisma.workHour.findMany({
      select: { id: true, projects: true },
    })

    const nameRenameMap = new Map()
    for (const m of MERGES) {
      for (const n of m.oldNames) nameRenameMap.set(n, m.newName)
    }

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
        if (entry && typeof entry.name === 'string' && nameRenameMap.has(entry.name)) {
          const oldName = entry.name
          entry.name = nameRenameMap.get(oldName)
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

    const jobResults = []
    for (const m of MERGES) {
      await prisma.receipt.updateMany({
        where: { projectId: m.deleteJobId },
        data: { projectId: m.keepJobId },
      })

      if (m.renameKeepTo) {
        await prisma.projectName.update({
          where: { id: m.keepJobId },
          data: { name: m.renameKeepTo },
        })
      }

      await prisma.projectName.delete({ where: { id: m.deleteJobId } })

      jobResults.push({
        keepJobId: m.keepJobId,
        deletedJobId: m.deleteJobId,
        renamedKeepTo: m.renameKeepTo || null,
      })
    }

    return NextResponse.json({
      ok: true,
      hoursRowsScanned: allHours.length,
      hoursRowsUpdated: rowsUpdated,
      entryRenameCounts,
      jobResults,
    })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message, stack: error.stack }, { status: 500 })
  }
}
