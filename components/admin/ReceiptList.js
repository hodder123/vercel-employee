'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FileText, Image as ImageIcon, Trash2, ExternalLink, Loader2 } from 'lucide-react'

export default function ReceiptList({ receipts }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState(null)

  const handleDelete = async (id) => {
    if (!confirm('Delete this receipt?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/receipts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      router.refresh()
    } catch (err) {
      alert(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (receipts.length === 0) {
    return <p className="text-sm text-muted-foreground">No receipts or invoices uploaded yet.</p>
  }

  return (
    <div className="space-y-2">
      {receipts.map((r) => {
        const isPdf = r.fileType === 'application/pdf'
        return (
          <div key={r.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
            <div className="flex items-center gap-3 min-w-0">
              {isPdf ? <FileText className="h-5 w-5 text-red-500 flex-shrink-0" /> : <ImageIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.vendor || r.fileName || 'Receipt'}</p>
                <p className="text-xs text-muted-foreground">
                  {r.date ? new Date(r.date).toLocaleDateString() : ''}
                  {r.amount ? ` · $${r.amount.toFixed(2)}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-4 w-4" />
              </a>
              <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id} className="text-muted-foreground hover:text-destructive">
                {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
