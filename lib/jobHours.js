import { prisma } from '@/lib/prisma'
import { DateTime } from 'luxon'

const TZ = 'America/Los_Angeles'

function parseProjects(val) {
  try {
    if (typeof val === 'string') return JSON.parse(val)
    return val || []
  } catch {
    return []
  }
}

/**
 * Returns flattened hour-entry rows for a single job (matched by project name),
 * optionally restricted to a date range, plus the total hours.
 */
export async function getJobHourRows(jobName, { start, end } = {}) {
  let dateFilter = {}
  if (start) {
    const startDt = DateTime.fromISO(start, { zone: TZ }).startOf('day').toJSDate()
    const endDt = end
      ? DateTime.fromISO(end, { zone: TZ }).endOf('day').toJSDate()
      : DateTime.now().setZone(TZ).endOf('day').toJSDate()
    dateFilter = { date: { gte: startDt, lte: endDt } }
  }

  const workHours = await prisma.workHour.findMany({
    where: {
      employee: { id: { not: '0' } },
      ...dateFilter,
    },
    orderBy: [{ date: 'asc' }],
    include: { employee: { select: { name: true, fullName: true } } },
  })

  const rows = []
  for (const entry of workHours) {
    const projects = parseProjects(entry.projects)
    const empName = entry.employee?.fullName || entry.employee?.name || 'Unknown'
    const dateStr = DateTime.fromJSDate(entry.date).setZone(TZ).toFormat('yyyy-MM-dd')

    for (const proj of projects) {
      if ((proj.name || 'Unassigned') !== jobName) continue
      rows.push({
        name: empName,
        description: proj.description || '',
        date: dateStr,
        hours: parseFloat(proj.hours) || 0,
      })
    }
  }

  rows.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))

  const totalHours = rows.reduce((sum, r) => sum + r.hours, 0)

  return { rows, totalHours }
}

/**
 * Returns a map of jobName -> most recent work-hour date logged against it
 * (as a JS Date), across all employees. Used to surface "recently logged" jobs.
 */
export async function getLastActivityByJobName() {
  const workHours = await prisma.workHour.findMany({
    where: { employee: { id: { not: '0' } } },
    orderBy: { date: 'desc' },
    select: { date: true, projects: true },
  })

  const lastActivity = {}
  for (const entry of workHours) {
    const projects = parseProjects(entry.projects)
    for (const proj of projects) {
      const name = proj.name || 'Unassigned'
      if (!lastActivity[name] || entry.date > lastActivity[name]) {
        lastActivity[name] = entry.date
      }
    }
  }
  return lastActivity
}
