'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DeleteUserConfirm({ employee, workHoursCount }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmText, setConfirmText] = useState('')

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/delete-user/${employee.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        let data = null
        try {
          data = await res.json()
        } catch {}
        throw new Error(data?.error || 'Failed to delete user')
      }

      router.push('/admin/all-work-hours')
      router.refresh()
    } catch (err) {
      setError(err?.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-900 mb-2">
              Warning: This action cannot be undone!
            </h3>
            <p className="text-red-800 mb-4">Deleting this user will permanently remove:</p>
            <ul className="list-disc list-inside text-red-800 space-y-1">
              <li>User login account</li>
              <li>Employee profile information</li>
              <li>
                <strong>
                  {workHoursCount} work hour {workHoursCount === 1 ? 'entry' : 'entries'}
                </strong>
              </li>
              <li>All associated data and signatures</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Employee to Delete:</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Full Name:</span>
            <span className="font-medium text-gray-900">{employee.fullName || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Username:</span>
            <span className="font-medium text-gray-900">{employee.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Employee ID:</span>
            <span className="font-medium text-gray-900">{employee.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Work Hours Entries:</span>
            <span className="font-medium text-red-600">{workHoursCount}</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm:
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DELETE here"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleDelete}
          disabled={loading || confirmText !== 'DELETE'}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Deleting User...' : 'Delete User Permanently'}
        </button>

        <Link
          href={`/admin/employee/${employee.id}`}
          className="sm:w-auto px-6 text-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition"
        >
          Cancel
        </Link>
      </div>
    </div>
  )
}
