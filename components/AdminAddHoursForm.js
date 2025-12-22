'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminAddHoursForm({ employee }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    projects: [
      { name: '', location: '', hours: '', description: '' }
    ]
  })

  const addProject = () => {
    setFormData({
      ...formData,
      projects: [...formData.projects, { name: '', location: '', hours: '', description: '' }]
    })
  }

  const removeProject = (index) => {
    const newProjects = formData.projects.filter((_, i) => i !== index)
    setFormData({ ...formData, projects: newProjects })
  }

  const updateProject = (index, field, value) => {
    const newProjects = [...formData.projects]
    newProjects[index][field] = value
    setFormData({ ...formData, projects: newProjects })
  }

  const handleSubmit = async (e) => {
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
      const res = await fetch('/api/admin/add-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          date: formData.date,
          projects: validProjects
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add hours')
      }

      router.push(`/admin/employee/${employee.id}`)
      router.refresh()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> As an admin, you can add hours for any date. The entry will be marked as "Added by Admin".
        </p>
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          max={new Date().toISOString().split('T')[0]}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Projects */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700">
            Projects
          </label>
          <button
            type="button"
            onClick={addProject}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add Project
          </button>
        </div>

        {formData.projects.map((project, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Project {index + 1}</span>
              {formData.projects.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeProject(index)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              )}
            </div>

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
              value={project.location}
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
              value={project.description}
              onChange={(e) => updateProject(index, 'description', e.target.value)}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
      >
        {loading ? 'Adding Hours...' : 'Add Hours for ' + (employee.fullName || employee.name)}
      </button>
    </form>
  )
}