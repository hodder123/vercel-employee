'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileSpreadsheet, CheckCircle, AlertCircle, Eye, CalendarDays } from 'lucide-react'

const getPacificNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))

const formatDateInput = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getPreviousWeekRange = () => {
  const now = getPacificNow()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const startOfThisWeek = new Date(now)
  startOfThisWeek.setDate(startOfThisWeek.getDate() - mondayOffset)

  const start = new Date(startOfThisWeek)
  start.setDate(start.getDate() - 7)

  const end = new Date(startOfThisWeek)
  end.setDate(end.getDate() - 1)

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end)
  }
}

const getThisWeekRange = () => {
  const now = getPacificNow()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const start = new Date(now)
  start.setDate(start.getDate() - mondayOffset)

  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end)
  }
}

export default function SendReportPage() {
  const defaultRange = getPreviousWeekRange()
  const [startDate, setStartDate] = useState(defaultRange.startDate)
  const [endDate, setEndDate] = useState(defaultRange.endDate)
  const [extraEmail, setExtraEmail] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingSend, setLoadingSend] = useState(false)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const fetchPreview = async () => {
    setLoadingPreview(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/admin/report-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to build preview')
      setPreview(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingPreview(false)
    }
  }

  const sendReport = async () => {
    setLoadingSend(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/admin/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, extraEmail })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send report')
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingSend(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Preview payroll and send a report for any date range.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Weekly Report
          </CardTitle>
          <CardDescription>
            Automatic reports run Sundays at 9:00 AM PT for the previous week (Monday-Sunday).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="extraEmail">Additional email (optional)</Label>
            <Input
              id="extraEmail"
              type="email"
              placeholder="payroll@company.com"
              value={extraEmail}
              onChange={(e) => setExtraEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Report always goes to employee.hodder@gmail.com. Add one more recipient here.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const range = getPreviousWeekRange()
                setStartDate(range.startDate)
                setEndDate(range.endDate)
              }}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Previous Week
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const range = getThisWeekRange()
                setStartDate(range.startDate)
                setEndDate(range.endDate)
              }}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              This Week
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">{result.message}</p>
                {result.entriesCount && <p className="mt-0.5">Entries processed: {result.entriesCount}</p>}
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <Button
              onClick={fetchPreview}
              disabled={loadingPreview || loadingSend}
              className="w-full hidden md:inline-flex"
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              {loadingPreview ? 'Building Preview...' : 'Preview Report'}
            </Button>
            <Button
              onClick={sendReport}
              disabled={loadingSend || loadingPreview}
              className="w-full"
              size="lg"
            >
              {loadingSend ? 'Sending Report...' : 'Send Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
          <CardDescription>See totals and a row-by-row preview before sending.</CardDescription>
        </CardHeader>
        <CardContent>
          {!preview && (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Select dates and click Preview Report to see what will be emailed.
            </div>
          )}

          {preview && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Date range</p>
                  <p className="mt-1 font-semibold">
                    {preview.range.startDate} to {preview.range.endDate}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Total hours</p>
                  <p className="mt-1 text-xl font-bold text-blue-700">{preview.totals.hours}h</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Entries</p>
                  <p className="mt-1 text-xl font-bold">{preview.totals.entries}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Employees</p>
                  <p className="mt-1 text-xl font-bold">{preview.totals.employees}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="hidden md:grid md:grid-cols-7 gap-3 text-xs uppercase text-muted-foreground px-3">
                  <div>Employee</div>
                  <div>Date</div>
                  <div>Day</div>
                  <div>Projects</div>
                  <div>Description</div>
                  <div>Hours</div>
                  <div>Signature</div>
                </div>
                {preview.rows.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    No hours logged for this range yet.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                    {preview.rows.map((row, index) => (
                      <div
                        key={`${row.employee}-${row.date}-${index}`}
                        className="rounded-lg border bg-white/80 p-3 md:grid md:grid-cols-7 md:gap-3"
                      >
                        <div className="font-semibold md:font-medium">{row.employee}</div>
                        <div className="text-sm text-muted-foreground md:text-base">{row.date}</div>
                        <div className="text-sm text-muted-foreground md:text-base">{row.day}</div>
                        <div className="text-sm">
                          <ul className="list-disc pl-5 space-y-1">
                            {row.projects.map((line, idx) => (
                              <li key={idx}>{line.replace(/^[-] /, '')}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="text-sm text-muted-foreground">{row.description}</div>
                        <div className="font-semibold text-blue-700">{row.hours}h</div>
                        <div className="text-sm text-muted-foreground">{row.signature}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="md:hidden">
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Preview is available on larger screens (tablet, laptop, desktop) for easier reading.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
