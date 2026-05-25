'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, X, Loader2 } from 'lucide-react'

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

export default function UserEditHoursForm({ workHour }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    date: new Date(workHour.date).toISOString().split('T')[0],
    projects: buildInitialProjects(workHour)
  })

  // Photo upload state (per project index)
  const [photoLoading, setPhotoLoading] = useState({})
  const [photoError, setPhotoError] = useState({})
  const fileInputRefs = useRef({})

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
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json()
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

      router.push('/work-hours')
      router.refresh()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const anyPhotoUploading = Object.values(photoLoading).some(Boolean)

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

      <button
        type="submit"
        disabled={loading || anyPhotoUploading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
      >
        {loading ? 'Saving...' : anyPhotoUploading ? 'Wait for photos to upload…' : 'Save Changes'}
      </button>
    </form>
  )
}
