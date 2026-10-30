'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Briefcase, ChevronRight, Receipt, Search, Clock } from 'lucide-react'

const STATUS_LABEL = {
  active: 'Active',
  ready_to_invoice: 'Ready to Invoice',
  invoiced: 'Invoiced',
  paid: 'Paid',
}

const STATUS_VARIANT = {
  active: 'info',
  ready_to_invoice: 'warning',
  invoiced: 'success',
  paid: 'success',
}

const SORTS = [
  { value: 'recent', label: 'Recently Logged' },
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' },
]

function timeAgo(isoDate) {
  if (!isoDate) return null
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mo ago`
  return `${Math.floor(months / 12)} yr ago`
}

export default function JobsListClient({ jobs }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = jobs
    if (q) {
      list = list.filter(
        (j) =>
          j.name.toLowerCase().includes(q) ||
          (j.client && j.client.toLowerCase().includes(q))
      )
    }

    const sorted = [...list]
    if (sort === 'recent') {
      sorted.sort((a, b) => {
        if (!a.lastActivity && !b.lastActivity) return a.name.localeCompare(b.name)
        if (!a.lastActivity) return 1
        if (!b.lastActivity) return -1
        return new Date(b.lastActivity) - new Date(a.lastActivity)
      })
    } else if (sort === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sort === 'status') {
      sorted.sort((a, b) => a.status.localeCompare(b.status) || a.name.localeCompare(b.name))
    }
    return sorted
  }, [jobs, query, sort])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs or clients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
          {SORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSort(s.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                sort === s.value
                  ? 'bg-white shadow-sm font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((job) => (
              <Link
                key={job.id}
                href={`/admin/jobs/${job.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{job.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {job.client || 'No client set'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {job.lastActivity && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> {timeAgo(job.lastActivity)}
                    </span>
                  )}
                  {job.receiptCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Receipt className="h-3.5 w-3.5" /> {job.receiptCount}
                    </span>
                  )}
                  <Badge variant={STATUS_VARIANT[job.status] || 'info'}>
                    {STATUS_LABEL[job.status] || job.status}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
            {filtered.length === 0 && (
              <p className="p-6 text-center text-muted-foreground">
                {jobs.length === 0
                  ? 'No jobs yet. Add project names in Settings to create jobs.'
                  : 'No jobs match your search.'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
