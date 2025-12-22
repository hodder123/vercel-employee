'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UserEditHoursForm({ workHour }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    date: new Date(workHour.date).toISOString().split('T')[0],
    projects: workHour.projects.length > 0 
      ? workHour.projects 
      : [{ name: '', location: '', hours: '', description: '' }]
  })

  const updateProject = (index, field, value) => {
    const newProjects = [...formData.projects]
    newProjects[index][field] = value
    setFormData({ ...formData, projects: newProjects })
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const validProjects = formData.projects.filter(p => p.name && p.hours)
    
    if (validProjects.length === 0) {
      setError('Please add at least one project with name and hours')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/work-hours/${workHour.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          projects: validProjects
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update hours')
      }

      router.push('/work-hours')
      router.refresh()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleUpdate} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> You can only edit this entry within 12 hours of creation.
        </p>
      </div>

      {formData.projects.map((project, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
          <span className="text-sm font-medium text-gray-600">Project {index + 1}</span>

          <input
            type="text"
            placeholder="Project Name *"
            value={project.name}
            onChange={(e) => updateProject(index, 'name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />

          <input
            type="text"
            placeholder="Location"
            value={project.location || ''}
            onChange={(e) => updateProject(index, 'location', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="number"
            step="0.25"
            min="0"
            max="24"
            placeholder="Hours *"
            value={project.hours}
            onChange={(e) => updateProject(index, 'hours', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />

          <textarea
            placeholder="Description"
            value={project.description || ''}
            onChange={(e) => updateProject(index, 'description', e.target.value)}
            rows="2"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}