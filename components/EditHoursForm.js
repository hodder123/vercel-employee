'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, X, Loader2 } from 'lucide-react'
import { prepareImageForUpload } from '@/lib/prepareImage'

function parsePhotos(val) {
  try {
    if (Array.isArray(val)) return val
    if (typeof val === 'string') {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : []
    }
    return []
  } catch {
    return []
  }
}

// Build the initial project list with a `photos` array on each project.
// Legacy entries may store photos only at the top level — if no project
// carries photos, seed the first project so they remain visible/editable.
function buildInitialProjects(workHour) {
  const projects = (workHour.projects.length > 0
    ? workHour.projects
    : [{ name: '', location: '', hours: '', description: '' }]
  ).map(p => ({ ...p, photos: Array.isArray(p.photos) ? p.photos : [] }))

  const hasPerProjectPhotos = projects.some(p => p.photos.length > 0)
  const topLevelPhotos = parsePhotos(workHour.photos)
  if (!hasPerProjectPhotos && topLevelPhotos.length > 0 && projects.length > 0) {
    projects[0] = { ...projects[0], photos: topLevelPhotos }
  }
  return projects
}

export default function EditHoursForm({ workHour }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [formData, setFormData] = useState({
    date: new Date(workHour.date).toISOString().split('T')[0],
    projects: buildInitialProjects(workHour)
  })

  // Photo upload state (per project index)
  const [photoLoading, setPhotoLoading] = useState({})
  const [photoError, setPhotoError] = useState({})
  const fileInputRefs = useRef({})

  const addProject = () => {
    setFormData({
      ...formData,
      projects: [...formData.projects, { name: '', location: '', hours: '', description: '', photos: [] }]
    })
  }

  const removeProject = (index) => {
    const newProjects = formData.projects.filter((_, i) => i !== index)
    setFormData({ ...formData, projects: newProjects })
  }

  const updateProject = (index, field, value) => {
    const newProjects = [...formData.projects]
    newProjects[index] = { ...newProjects[index], [field]: value }
    setFormData({ ...formData, projects: newProjects })
  }

  const handlePhotoChange = async (e, idx) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setPhotoLoading(prev => ({ ...prev, [idx]: true }))
    setPhotoError(prev => ({ ...prev, [idx]: '' }))
    const newUrls = []
    for (const rawFile of files) {
      try {
        // HEIC/HEIF and oversized photos are converted to a small JPEG
        // before upload — see lib/prepareImage.js for the reasoning.
        const file = await prepareImageForUpload(rawFile)
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        let data
        try {
          data = await res.json()
        } catch {
          throw new Error(
            res.status === 413
              ? 'That photo is too large to upload. Please try a smaller one.'
              : 'Upload failed — please try again.'
          )
        }
        if (!res.ok) throw new Error(data.error || 'Upload failed')
        newUrls.push(data.url)
      } catch (err) {
        setPhotoError(prev => ({ ...prev, [idx]: err.message }))
      }
    }
    updateProject(idx, 'photos', [...(formData.projects[idx].photos || []), ...newUrls])
    setPhotoLoading(prev => ({ ...prev, [idx]: false }))
    e.target.value = ''
  }

  const removePhoto = (projectIdx, photoIdx) => {
    const updated = (formData.projects[projectIdx].photos || []).filter((_, i) => i !== photoIdx)
    updateProject(projectIdx, 'photos', updated)
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

    // Aggregate all photos across projects for the top-level photos column
    const allPhotos = validProjects.flatMap(p => Array.isArray(p.photos) ? p.photos : [])

    try {
      const res = await fetch(`/api/work-hours/${workHour.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          projects: validProjects,
          photos: allPhotos
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update hours')
      }

      router.push(`/admin/employee/${workHour.employeeId}`)
      router.refresh()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/work-hours/${workHour.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        throw new Error('Failed to delete entry')
      }

      router.push(`/admin/employee/${workHour.employeeId}`)
      router.refresh()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const anyPhotoUploading = Object.values(photoLoading).some(Boolean)

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-6">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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

              {/* Photos */}
              <div>
                {project.photos?.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {project.photos.map((url, photoIdx) => (
                      <div key={photoIdx} className="relative group rounded-lg overflow-hidden aspect-square">
                        <img src={url} alt={`Photo ${photoIdx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(index, photoIdx)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove photo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="file"
                  ref={el => { fileInputRefs.current[index] = el }}
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handlePhotoChange(e, index)}
                />

                <button
                  type="button"
                  onClick={() => fileInputRefs.current[index]?.click()}
                  disabled={photoLoading[index]}
                  className="flex items-center gap-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50"
                >
                  {photoLoading[index] ? (
                    <><Loader2 className="h-4 w-4 animate-spin text-blue-500" /> Uploading…</>
                  ) : (
                    <><Camera className="h-4 w-4 text-gray-500" /> {project.photos?.length ? 'Add More Photos' : 'Add Photos'}</>
                  )}
                </button>

                {photoError[index] && (
                  <p className="text-xs text-red-500 mt-1">{photoError[index]}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={loading || anyPhotoUploading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : anyPhotoUploading ? 'Wait for photos to upload…' : 'Save Changes'}
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading}
            className="sm:w-auto px-6 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            Delete Entry
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Entry?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this work hours entry? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
