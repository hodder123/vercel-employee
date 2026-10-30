import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// TEMPORARY. Remove after use.
const SECRET = '9b4e2f7a1c8d350e6b9a4c1f7e2d8b5a0c3f6e91'

const MERGES = [
  { newName: 'Shop', oldNames: ['shop'], keepJobId: 166, deleteJobIds: [27] },
  { newName: 'Rivian', oldNames: ['rivian'], keepJobId: 322, deleteJobIds: [46] },
  { newName: 'rivian blue', oldNames: ['blue rivian'], keepJobId: 139, deleteJobIds: [125] },
  { newName: 'Man lifts', oldNames: ['Man lift'], keepJobId: 255, deleteJobIds: [253] },
  { newName: 'Phil Huber - 772 Kelly Dr', oldNames: ['Phil Huber', '772 kelly dr'], keepJobId: 238, deleteJobIds: [286] },
  { newName: 'Mrs. Singh - 2145 Tranquille Rd', oldNames: ['Mrs. Singh', '2145 Tranquille Rd., Kamloops', '2145 Tranquille road'], keepJobId: 203, deleteJobIds: [294, 207] },
  { newName: 'Mike Jensen - 1207 Dakota Rd', oldNames: ['mike jensen', '1207 dakota'], keepJobId: 120, deleteJobIds: [24] },
  { newName: 'Misha Fassler - 1808 Paul Lake Rd', oldNames: ['misha fassler', '1808 paul lake rd'], keepJobId: 83, deleteJobIds: [30] },
  { newName: '2174 Tranquille', oldNames: ['2174'], keepJobId: 205, deleteJobIds: [209] },
  { newName: 'Andy - 210 West Battle Street', oldNames: ['210 west battle street', 'Andy  battle street.'], keepJobId: 268, deleteJobIds: [261] },
  { newName: '11753', oldNames: ['No11753'], keepJobId: 34, deleteJobIds: [35] },
]

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const nameRenameMap = new Map()
    for (const m of MERGES) {
      for (const n of m.oldNames) nameRenameMap.set(n, m.newName)
    }

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
      for (const delId of m.deleteJobIds) {
        await prisma.receipt.updateMany({
          where: { projectId: delId },
          data: { projectId: m.keepJobId },
        })
      }

      await prisma.projectName.update({
        where: { id: m.keepJobId },
        data: { name: m.newName },
      })

      for (const delId of m.deleteJobIds) {
        await prisma.projectName.delete({ where: { id: delId } })
      }

      jobResults.push({
        keepJobId: m.keepJobId,
        newName: m.newName,
        deletedJobIds: m.deleteJobIds,
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
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
