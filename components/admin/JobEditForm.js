'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, Check } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'ready_to_invoice', label: 'Ready to Invoice' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'paid', label: 'Paid' },
]

export default function JobEditForm({ job }) {
  const router = useRouter()
  const [client, setClient] = useState(job.client || '')
  const [siteAddress, setSiteAddress] = useState(job.siteAddress || '')
  const [status, setStatus] = useState(job.status)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client, siteAddress, status }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="client">Client</Label>
        <Input id="client" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client name" />
      </div>
      <div>
        <Label htmlFor="siteAddress">Site Address</Label>
        <Input id="siteAddress" value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} placeholder="123 Main St, Kamloops" />
      </div>
      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : saved ? <Check className="h-4 w-4 mr-1.5" /> : null}
        {saved ? 'Saved' : 'Save'}
      </Button>
    </div>
  )
}
