'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ExportCsvButton({ employeeId, label = 'Export CSV' }) {
  const [loading, setLoading] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Default: current month
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split('T')[0]
  const today = now.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })

  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(today)

  const handleExport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ start: startDate, end: endDate })
      if (employeeId) params.set('employeeId', employeeId)
      const res = await fetch(`/api/admin/export-csv?${params}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `timesheet_${startDate}_to_${endDate}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setShowDatePicker(false)
    } catch (err) {
      alert('Export failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!showDatePicker) {
    return (
      <Button variant="outline" size="sm" onClick={() => setShowDatePicker(true)}>
        <Download className="h-4 w-4 mr-1.5" />
        {label}
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
      <div>
        <label className="block text-xs text-gray-500 mb-1">From</label>
        <input
          type="date"
          value={startDate}
          max={endDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">To</label>
        <input
          type="date"
          value={endDate}
          min={startDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <Button size="sm" onClick={handleExport} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
        Download CSV
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setShowDatePicker(false)} disabled={loading}>
        Cancel
      </Button>
    </div>
  )
}
