'use client'

import Link from 'next/link'

export default function WorkHoursList({ workHours = [], role }) {
  const parseProjects = (projects) => {
    try {
      if (!projects) return []
      if (typeof projects === 'string') {
        const parsed = JSON.parse(projects)
        return Array.isArray(parsed) ? parsed : parsed ? [parsed] : []
      }
      return Array.isArray(projects) ? projects : [projects]
    } catch {
      return []
    }
  }

  const getHoursWorked = (entry) => {
    // support both API styles: hours_worked (snake) and hoursWorked (camel)
    const v = entry?.hours_worked ?? entry?.hoursWorked ?? 0
    const n = typeof v === 'string' ? parseFloat(v) : v
    return Number.isFinite(n) ? n : 0
  }

  if (!workHours || workHours.length === 0) {
    return <p className="text-gray-600 text-center py-8">No hours logged yet.</p>
  }

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto">
      {workHours.map((entry) => {
        const projects = parseProjects(entry.projects)
        const hoursWorked = getHoursWorked(entry)

        return (
          <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-gray-900">
                  {new Date(entry.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'America/Los_Angeles'
                  })}
                </p>
                <p className="text-sm text-gray-600">
                  Total:{' '}
                  <span className="font-medium text-blue-600">
                    {hoursWorked}h
                  </span>
                </p>
              </div>

              <Link
  href={role === 'admin' ? `/admin/edit-hours/${entry.id}` : `/edit-hours/${entry.id}`}
  className="text-sm text-blue-600 hover:text-blue-700"
>
  Edit
</Link>
            </div>

            {projects.length > 0 ? (
              <div className="space-y-2">
                {projects.map((project, idx) => (
                  <div key={idx} className="bg-gray-50 rounded p-3 text-sm">
                    <p className="font-medium text-gray-900">
                      {project?.name || 'Unnamed project'}
                    </p>
                    {project?.location ? (
                      <p className="text-gray-600">📍 {project.location}</p>
                    ) : null}
                    <p className="text-gray-600">⏱️ {project?.hours || 0}h</p>
                    {project?.description ? (
                      <p className="text-gray-600 mt-1">{project.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm">{entry.description || 'No description'}</p>
            )}

            {/* Signature */}
            {entry.signature && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Signature:</p>
                <img 
                  src={entry.signature} 
                  alt="Signature" 
                  className="h-16 border border-gray-300 rounded bg-white"
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
