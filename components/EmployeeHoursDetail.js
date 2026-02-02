'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Pencil, MapPin, Clock, FileText, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 10

export default function EmployeeHoursDetail({ employee, workHours }) {
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)

  const parseProjects = (projects) => {
    try {
      if (typeof projects === 'string') return JSON.parse(projects)
      return projects || []
    } catch { return [] }
  }

  const filteredHours = workHours.filter(entry => {
    if (filter === 'all') return true
    const entryDate = new Date(entry.date)
    const now = new Date()
    if (filter === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(now.getDate() - 7)
      return entryDate >= weekAgo
    }
    if (filter === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(now.getMonth() - 1)
      return entryDate >= monthAgo
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredHours.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedHours = filteredHours.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
    setPage(1)
  }

  return (
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
            const projects = parseProjects(entry.projects)

            return (
              <Card key={entry.id}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                    <div>
                      <p className="font-semibold">
                        {new Date(entry.date).toLocaleDateString('en-US', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                          timeZone: 'America/Los_Angeles'
                        })}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="info">{entry.hoursWorked}h</Badge>
                        {entry.signature === 'admin-added' && (
                          <Badge variant="secondary">Admin Added</Badge>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/edit-hours/${entry.id}`}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Link>
                    </Button>
                  </div>

                  {projects.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                      {projects.map((project, idx) => (
                        <div key={idx} className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
                          <div className="flex justify-between items-start">
                            <p className="font-medium">{project.name}</p>
                            <Badge variant="info" className="text-xs ml-2">{project.hours || 0}h</Badge>
                          </div>
                          {project.location && (
                            <p className="text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />{project.location}
                            </p>
                          )}
                          {project.description && (
                            <p className="text-muted-foreground">{project.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">{entry.description || 'No description'}</p>
                  )}

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
            Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredHours.length)} of {filteredHours.length}
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
            <span className="flex items-center text-sm px-2">
              {currentPage} / {totalPages}
            </span>
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
  )
}
