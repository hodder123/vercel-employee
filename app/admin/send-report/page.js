'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function SendReportPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const sendReport = async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const cronSecret = prompt('Enter CRON_SECRET from .env.local:')
      if (!cronSecret) {
        setError('Cancelled')
        setLoading(false)
        return
      }

      const res = await fetch('/api/cron/weekly-report', {
        headers: {
          'Authorization': `Bearer ${cronSecret}`
        }
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send report')
      }

      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Send Weekly Report</h1>
            <Link href="/admin/all-work-hours" className="text-blue-600 hover:text-blue-700 font-medium">
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Manual Report Trigger</h2>
            <p className="text-gray-600">
              This will generate and email the weekly report for the last Monday-Friday period.
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {result && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              <p className="font-semibold">{result.message}</p>
              {result.entriesCount && <p className="text-sm mt-1">Entries processed: {result.entriesCount}</p>}
            </div>
          )}

          <button
            onClick={sendReport}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Generating and Sending Report...' : 'Send Weekly Report Now'}
          </button>

          <p className="text-sm text-gray-500 mt-4">
            Note: The automatic report runs every Sunday at 9 AM Pacific Time via Vercel Cron.
          </p>
        </div>
      </main>
    </div>
  )
}