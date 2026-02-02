'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, MapPin, Clock, FileText, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function WorkHoursList({ workHours = [], role }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')
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
    const v = entry?.hours_worked ?? entry?.hoursWorked ?? 0
    const n = typeof v === 'string' ? parseFloat(v) : v
    return Number.isFinite(n) ? n : 0
  }

  const getEditTimeLeft = (entry) => {
    if (role === 'admin') return null
    const created = new Date(entry.createdAt)
    const now = new Date()
    const hoursElapsed = (now - created) / (1000 * 60 * 60)
    const hoursLeft = 12 - hoursElapsed
    if (hoursLeft <= 0) return 'expired'
    if (hoursLeft < 1) return `${Math.round(hoursLeft * 60)}m left`
    return `${Math.round(hoursLeft)}h left`
  }

  if (!workHours || workHours.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No hours logged yet.</p>
  }

  return (
    <div className="space-y-4">
      {deleteError && (
        <p className="text-sm text-red-600">{deleteError}</p>
      )}
      {workHours.map((entry) => {
        const projects = parseProjects(entry.projects)
        const hoursWorked = getHoursWorked(entry)
        const editTime = getEditTimeLeft(entry)
        const canEdit = role === 'admin' || editTime !== 'expired'
        const isAdminAdded = entry.signature === 'admin-added'
        const canDelete = role !== 'admin' && editTime !== 'expired' && !isAdminAdded

        return (
          <div key={entry.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">
                  {new Date(entry.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'America/Los_Angeles'
                  })}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="info">{hoursWorked}h</Badge>
                  {editTime && editTime !== 'expired' && (
                    <Badge variant="warning" className="text-xs">{editTime}</Badge>
                  )}
                  {editTime === 'expired' && role !== 'admin' && (
                    <Badge variant="secondary" className="text-xs">Edit window closed</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={role === 'admin' ? `/admin/edit-hours/${entry.id}` : `/edit-hours/${entry.id}`}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Link>
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === entry.id}
                    onClick={async () => {
                      const confirmed = window.confirm('Delete this entry? This cannot be undone.')
                      if (!confirmed) return
                      setDeletingId(entry.id)
                      setDeleteError('')
                      try {
                        const res = await fetch(`/api/work-hours/${entry.id}`, { method: 'DELETE' })
                        const data = await res.json()
                        if (!res.ok) throw new Error(data.error || 'Failed to delete entry')
                        router.refresh()
                      } catch (err) {
                        setDeleteError(err.message)
                      } finally {
                        setDeletingId(null)
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> {deletingId === entry.id ? 'Deleting...' : 'Delete'}
                  </Button>
                )}
              </div>
            </div>

            {projects.length > 0 ? (
              <div className="space-y-2">
                {projects.map((project, idx) => (
                  <div key={idx} className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
                    <p className="font-medium">{project?.name || 'Unnamed project'}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                      {project?.location && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{project.location}</span>
                      )}
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{project?.hours || 0}h</span>
                      {project?.description && (
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{project.description}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{entry.description || 'No description'}</p>
            )}

            {entry.signature && entry.signature !== 'admin-added' && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">Signature:</p>
                <img src={entry.signature} alt="Signature" className="h-12 border rounded bg-white" />
              </div>
            )}
            {entry.signature === 'admin-added' && (
              <div className="pt-2">
                <Badge variant="secondary" className="text-xs">Added by Admin</Badge>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
