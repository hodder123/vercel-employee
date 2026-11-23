'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Megaphone, Pencil, Trash2, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NoticesManager({ initialNotices, employees }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [everyone, setEveryone] = useState(false)
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const nameOf = (id) => {
    const e = employees.find((x) => x.id === id)
    return e ? e.fullName || e.name : id
  }

  const reset = () => {
    setEditingId(null)
    setMessage('')
    setEveryone(false)
    setSelected([])
    setError('')
  }

  const toggle = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(editingId ? `/api/admin/notices/${editingId}` : '/api/admin/notices', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, allEmployees: everyone, employeeIds: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      reset()
      router.refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const edit = (n) => {
    setEditingId(n.id)
    setMessage(n.message)
    setEveryone(n.allEmployees)
    setSelected(n.employeeIds || [])
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleActive = async (n) => {
    await fetch(`/api/admin/notices/${n.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !n.active }),
    })
    router.refresh()
  }

  const remove = async (n) => {
    if (!confirm('Delete this notice?')) return
    await fetch(`/api/admin/notices/${n.id}`, { method: 'DELETE' })
    if (editingId === n.id) reset()
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{editingId ? 'Edit notice' : 'New notice'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notice-message">Message</Label>
            <Textarea
              id="notice-message"
              rows={3}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Please remember to add the address for every job."
            />
          </div>

          <div className="space-y-2">
            <Label>Show to</Label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={everyone} onChange={() => setEveryone(true)} /> Everyone
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={!everyone} onChange={() => setEveryone(false)} /> Selected employees
              </label>
            </div>
            {!everyone && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md border p-3 max-h-56 overflow-y-auto">
                {employees.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selected.includes(e.id)} onChange={() => toggle(e.id)} />
                    {e.fullName || e.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Save changes' : 'Post notice'}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={reset} disabled={saving}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {initialNotices.length === 0 && <p className="text-sm text-muted-foreground">No notices yet.</p>}
        {initialNotices.map((n) => (
          <Card key={n.id} className={n.active ? '' : 'opacity-60'}>
            <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Megaphone className="h-3.5 w-3.5" />
                  {n.active ? 'Active' : 'Paused'} ·{' '}
                  {n.allEmployees ? 'Everyone' : n.employeeIds.map(nameOf).join(', ')}
                </div>
                <p className="whitespace-pre-wrap text-sm">{n.message}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => toggleActive(n)} title={n.active ? 'Pause' : 'Resume'}>
                  {n.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => edit(n)} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(n)} title="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
