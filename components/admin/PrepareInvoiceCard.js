'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileDown, Loader2 } from 'lucide-react'

export default function PrepareInvoiceCard({ jobId, jobName }) {
  const router = useRouter()
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })

  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(today)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePrepare = async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ start: startDate, end: endDate })
      const res = await fetch(`/api/admin/jobs/${jobId}/invoice-packet?${params}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to prepare packet')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = jobName.replace(/[^a-zA-Z0-9-_]/g, '_')
      a.download = `${safeName}_invoice_packet_${startDate}_to_${endDate}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      router.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="text-base">Prepare for Invoicing</CardTitle>
        <p className="text-sm text-muted-foreground">
          Bundles hours + receipts for a date range into a PDF packet and marks this job ready to invoice.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">From</label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">To</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handlePrepare} disabled={loading} className="w-full bg-amber-600 hover:bg-amber-700 text-white">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <FileDown className="h-4 w-4 mr-1.5" />}
          {loading ? 'Preparing packet…' : 'Prepare for Invoicing'}
        </Button>
      </CardContent>
    </Card>
  )
}
