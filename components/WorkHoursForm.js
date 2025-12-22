'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'

export default function WorkHoursForm({ employeeId, employeeName }) {
  const router = useRouter()
const sigCanvas = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSigned, setHasSigned] = useState(false)
  
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

  const clearSignature = () => {
    sigCanvas.current.clear()
    setHasSigned(false)
  }

const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate
    const validProjects = formData.projects.filter(p => p.name && p.hours)
    if (validProjects.length === 0) {
      setError('Please add at least one project with name and hours')
      setLoading(false)
      return
    }

    // Get signature
    const signatureData = sigCanvas.current.toDataURL('image/png')
    
    // Validate signature is not empty
    if (sigCanvas.current.isEmpty()) {
      setError('Digital signature is required. Please sign before submitting.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/work-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          date: formData.date,
          projects: validProjects,
          signature: signatureData
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to log hours')
      }

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        projects: [{ name: '', location: '', hours: '', description: '' }]
      })
      clearSignature()

      router.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
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

{/* Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date (Today or Yesterday Only)
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          min={(() => {
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            return yesterday.toISOString().split('T')[0]
          })()}
          max={new Date().toISOString().split('T')[0]}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <p className="text-xs text-gray-500 mt-1">You can only log hours for today or yesterday</p>
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

      {/* Signature */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Digital Signature *
        </label>
        <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
          <SignatureCanvas
            ref={sigCanvas}
            onEnd={() => setHasSigned(true)}
            canvasProps={{
              className: 'w-full h-40 bg-white',
            }}
          />
        </div>
        <button
          type="button"
          onClick={clearSignature}
          className="mt-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Clear Signature
        </button>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !hasSigned}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Logging Hours...' : !hasSigned ? 'Please Sign First' : 'Log Hours'}
      </button>
    </form>
  )
}