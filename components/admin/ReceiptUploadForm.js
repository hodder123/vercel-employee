'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Loader2 } from 'lucide-react'

export default function ReceiptUploadForm({ jobId }) {
  const router = useRouter()
  const fileRef = useRef(null)
  const [vendor, setVendor] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }))
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) {
      setError('Choose a file first')
      return
    }
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', jobId)
      if (vendor) formData.append('vendor', vendor)
      if (amount) formData.append('amount', amount)
      if (date) formData.append('date', date)

      const res = await fetch('/api/admin/receipts', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Upload failed')
      }
      setVendor('')
      setAmount('')
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
      <div className="col-span-2">
        <Label htmlFor="receipt-file">Receipt / Invoice File</Label>
        <Input id="receipt-file" ref={fileRef} type="file" accept="image/*,application/pdf" />
      </div>
      <div>
        <Label htmlFor="vendor">Vendor</Label>
        <Input id="vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Home Depot" />
      </div>
      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
      </div>
      <div className="col-span-2">
        <Label htmlFor="receipt-date">Date</Label>
        <Input id="receipt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {error && <p className="col-span-2 text-sm text-destructive">{error}</p>}
      <div className="col-span-2">
        <Button type="submit" disabled={uploading} className="w-full">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Upload className="h-4 w-4 mr-1.5" />}
          Upload
        </Button>
      </div>
    </form>
  )
}
