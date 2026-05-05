'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Pencil, MapPin, ChevronLeft, ChevronRight, Image as ImageIcon, ExternalLink, Clock } from 'lucide-react'

const SUBMITTED_FMT = {
  year: 'numeric', month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit',
  timeZone: 'America/Los_Angeles', timeZoneName: 'short'
}

function formatSubmitted(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('en-US', SUBMITTED_FMT)
}

const PAGE_SIZE = 10

function parseJSON(val) {
  try {
    if (typeof val === 'string') return JSON.parse(val)
    return val || []
  } catch {
    return []
  }
}

export default function EmployeeHoursDetail({ employee, workHours }) {
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [lightbox, setLightbox] = useState(null) // URL of enlarged photo

  const filteredHours = workHours.filter(entry => {
    if (filter === 'all') return true
    const d = new Date(entry.date)
    const now = new Date()
    if (filter === 'week') {
      const ago = new Date(); ago.setDate(now.getDate() - 7); return d >= ago
    }
    if (filter === 'month') {
      const ago = new Date(); ago.setMonth(now.getMonth() - 1); return d >= ago
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredHours.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedHours = filteredHours.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleFilterChange = (v) => { setFilter(v); setPage(1) }

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Job site photo"
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-3xl leading-none"
          >
            ×
          </button>
        </div>
      )}

      <div className="space-y-4">
        <Tabs value={filter} onValueChange={handleFilterChange}>
          <TabsList>
            <TabsTrigger value="all">All Time ({workHours.length})</TabsTrigger>
            <TabsTrigger value="month">Last 30 Days</TabsTrigger>
            <TabsTrigger value="week">Last 7 Days</TabsTrigger>
          </TabsList>
        </Tabs>

        {paginatedHours.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No work hours found for this period</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {paginatedHours.map((entry) => {
              const projects = parseJSON(entry.projects)
              const photos = parseJSON(entry.photos)
              const hasLocation = entry.latitude && entry.longitude
              const mapsUrl = hasLocation
                ? `https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`
                : null

              return (
                <Card key={entry.id}>
                  <CardContent className="p-4 sm:p-5">
                    {/* Header row */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                      <div>
                        <p className="font-semibold">
                          {new Date(entry.date).toLocaleDateString('en-US', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                            timeZone: 'America/Los_Angeles'
                          })}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="info">{entry.hoursWorked}h</Badge>
                          {entry.signature === 'admin-added' && (
                            <Badge variant="secondary">Admin Added</Badge>
                          )}
                          {photos.length > 0 && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <ImageIcon className="h-3 w-3" />
                              {photos.length} photo{photos.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        {/* Admin-only submission timestamp */}
                        {entry.createdAt && (
                          <p
                            className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5"
                            title={`Submitted ${formatSubmitted(entry.createdAt)}${
                              entry.updatedAt && new Date(entry.updatedAt).getTime() !== new Date(entry.createdAt).getTime()
                                ? ` · Last edited ${formatSubmitted(entry.updatedAt)}`
                                : ''
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            Submitted {formatSubmitted(entry.createdAt)}
                            {entry.updatedAt && new Date(entry.updatedAt).getTime() - new Date(entry.createdAt).getTime() > 60_000 && (
                              <span className="ml-1 text-muted-foreground/80">
                                · edited {formatSubmitted(entry.updatedAt)}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/edit-hours/${entry.id}`}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                        </Link>
                      </Button>
                    </div>

                    {/* Projects */}
                    {projects.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-3">
                        {projects.map((project, idx) => (
                          <div key={idx} className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
                            <div className="flex justify-between items-start">
                              <p className="font-medium">{project.name}</p>
                              <Badge variant="info" className="text-xs ml-2">{project.hours || 0}h</Badge>
                            </div>
                            {project.location && (
                              <p className="text-muted-foreground flex items-center gap-1 text-xs">
                                <MapPin className="h-3 w-3" />{project.location}
                              </p>
                            )}
                            {project.description && (
                              <p className="text-muted-foreground text-xs">{project.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm mb-3">{entry.description || 'No description'}</p>
                    )}

                    {/* GPS Location */}
                    {(hasLocation || entry.locationName) && (
                      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-3 text-xs">
                        <MapPin className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-blue-700">Logged from</p>
                          <p className="text-blue-600 truncate">{entry.locationName || `${entry.latitude?.toFixed(4)}, ${entry.longitude?.toFixed(4)}`}</p>
                        </div>
                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-medium flex-shrink-0"
                          >
                            Map <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Photos */}
                    {photos.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground mb-1.5 font-medium">Job site photos:</p>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                          {photos.map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setLightbox(url)}
                              className="relative rounded-md overflow-hidden aspect-square hover:opacity-90 transition-opacity group"
                            >
                              <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Signature */}
                    {entry.signature && entry.signature !== 'admin-added' && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Signature:</p>
                        <img src={entry.signature} alt="Signature" className="h-14 border rounded bg-white p-1" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredHours.length)} of {filteredHours.length}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="flex items-center text-sm px-2">{currentPage} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
