'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'
import { Camera, X, Loader2, CheckCircle, AlertCircle, Plus, Trash2, ChevronDown } from 'lucide-react'

const QUICK_HOURS = [1, 2, 4, 8]

export default function WorkHoursForm({ employeeId, employeeName }) {
  const router = useRouter()
  const sigCanvas = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSigned, setHasSigned] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [projectNames, setProjectNames] = useState([])

  // Load shared project names on mount
  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => Array.isArray(data) && setProjectNames(data.map(p => p.name)))
      .catch(() => {})
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (openDropdown !== null) {
        const ref = dropdownRefs.current[openDropdown]
        if (ref && !ref.contains(e.target)) {
          setOpenDropdown(null)
        }
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openDropdown])

  const [formData, setFormData] = useState({
    date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }),
    projects: [{ name: '', location: '', hours: '', description: '', photos: [] }],
  })

  // Track uploading state per project
  const [photoLoading, setPhotoLoading] = useState({})
  const [photoError, setPhotoError] = useState({})
  const fileInputRefs = useRef({})

  // Dropdown open state per project index
  const [openDropdown, setOpenDropdown] = useState(null)
  const dropdownRefs = useRef({})

  // ── Photo upload per project ──────────────────────────────────────────────
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
    const updated = formData.projects[projectIdx].photos.filter((_, i) => i !== photoIdx)
    updateProject(projectIdx, 'photos', updated)
  }

  // ── Project helpers ───────────────────────────────────────────────────────
  const addProject = () =>
    setFormData(f => ({
      ...f,
      projects: [...f.projects, { name: '', location: '', hours: '', description: '', photos: [] }],
    }))

  const removeProject = (idx) =>
    setFormData(f => ({ ...f, projects: f.projects.filter((_, i) => i !== idx) }))

  const updateProject = (idx, field, value) =>
    setFormData(f => {
      const p = [...f.projects]
      p[idx] = { ...p[idx], [field]: value }
      return { ...f, projects: p }
    })

  const setQuickHours = (idx, h) => updateProject(idx, 'hours', String(h))

  const clearSignature = () => {
    sigCanvas.current.clear()
    setHasSigned(false)
  }

  // ── Date helpers ──────────────────────────────────────────────────────────
  const getPSTDate = (offset = 0) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const validProjects = formData.projects.filter(p => p.name && p.hours)
    if (validProjects.length === 0) {
      setError('Please add at least one project with a name and hours.')
      setLoading(false)
      return
    }

    if (sigCanvas.current.isEmpty()) {
      setError('Digital signature is required. Please sign before submitting.')
      setLoading(false)
      return
    }

    const signatureData = sigCanvas.current.toDataURL('image/png')

    // Save any new project names to the shared list
    for (const p of validProjects) {
      if (p.name && !projectNames.includes(p.name)) {
        fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: p.name }),
        }).then(r => r.json()).then(saved => {
          if (saved?.name) setProjectNames(prev => [...new Set([...prev, saved.name])].sort())
        }).catch(() => {})
      }
    }

    // Aggregate all photos from all projects for top-level storage
    const allPhotos = validProjects.flatMap(p => p.photos || [])

    try {
      const res = await fetch('/api/work-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          date: formData.date,
          projects: validProjects,
          signature: signatureData,
          photos: allPhotos.length ? allPhotos : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to log hours')
      }

      // Reset
      setFormData({
        date: getPSTDate(),
        projects: [{ name: '', location: '', hours: '', description: '', photos: [] }],
      })
      clearSignature()
      setPhotoLoading({})
      setPhotoError({})
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3500)
      router.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const anyPhotoUploading = Object.values(photoLoading).some(Boolean)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Success banner */}
      {submitted && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          Hours logged successfully!
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Date ── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Date
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData(f => ({ ...f, date: e.target.value }))}
          min={getPSTDate(-1)}
          max={getPSTDate(0)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          required
        />
        <p className="text-xs text-gray-400 mt-1">Today or yesterday only</p>
      </div>

      {/* ── Projects ── */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-semibold text-gray-700">Projects</label>
          <button
            type="button"
            onClick={addProject}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="h-3.5 w-3.5" /> Add Project
          </button>
        </div>

        {formData.projects.map((project, idx) => (
          <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Project {idx + 1}
              </span>
              {formData.projects.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeProject(idx)}
                  className="text-red-500 hover:text-red-600 text-xs flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              )}
            </div>

            {/* Project name with click-to-open dropdown */}
            <div className="relative" ref={el => dropdownRefs.current[idx] = el}>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Project name *"
                  value={project.name}
                  onChange={(e) => { updateProject(idx, 'name', e.target.value); setOpenDropdown(idx) }}
                  onFocus={() => setOpenDropdown(idx)}
                  className="w-full px-3 py-2.5 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  required
                  autoComplete="off"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setOpenDropdown(openDropdown === idx ? null : idx)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === idx ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {openDropdown === idx && projectNames.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {projectNames
                    .filter(name => name.toLowerCase().includes(project.name.toLowerCase()))
                    .map(name => (
                      <li key={name}>
                        <button
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); updateProject(idx, 'name', name); setOpenDropdown(null) }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors ${project.name === name ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                        >
                          {name}
                        </button>
                      </li>
                    ))
                  }
                  {projectNames.filter(name => name.toLowerCase().includes(project.name.toLowerCase())).length === 0 && (
                    <li className="px-3 py-2 text-sm text-gray-400 italic">No matches — type to add new</li>
                  )}
                </ul>
              )}
            </div>

            <input
              type="text"
              placeholder="Site / location (optional)"
              value={project.location}
              onChange={(e) => updateProject(idx, 'location', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />

            {/* Hours with quick-select */}
            <div>
              <div className="flex gap-1.5 mb-1.5">
                {QUICK_HOURS.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setQuickHours(idx, h)}
                    className={`flex-1 text-xs py-1 rounded-md border font-medium transition-colors
                      ${project.hours === String(h)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
              <input
                type="number"
                step="0.25"
                min="0"
                max="24"
                placeholder="Custom hours *"
                value={project.hours}
                onChange={(e) => updateProject(idx, 'hours', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              />
            </div>

            <textarea
              placeholder="Description / notes (optional)"
              value={project.description}
              onChange={(e) => updateProject(idx, 'description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
            />

            {/* ── Per-project photos ── */}
            <div>
              {project.photos?.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {project.photos.map((url, photoIdx) => (
                    <div key={photoIdx} className="relative group rounded-lg overflow-hidden aspect-square">
                      <img src={url} alt={`Photo ${photoIdx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx, photoIdx)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                type="file"
                ref={el => fileInputRefs.current[idx] = el}
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => handlePhotoChange(e, idx)}
              />

              <button
                type="button"
                onClick={() => fileInputRefs.current[idx]?.click()}
                disabled={photoLoading[idx]}
                className="flex items-center gap-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50"
              >
                {photoLoading[idx] ? (
                  <><Loader2 className="h-4 w-4 animate-spin text-blue-500" /> Uploading…</>
                ) : (
                  <><Camera className="h-4 w-4 text-gray-500" /> {project.photos?.length ? 'Add More Photos' : 'Add Photos'}</>
                )}
              </button>

              {photoError[idx] && (
                <p className="text-xs text-red-500 mt-1">{photoError[idx]}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Signature ── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Digital Signature *
        </label>
        <div className="border-2 border-gray-300 rounded-xl overflow-hidden bg-white">
          <SignatureCanvas
            ref={sigCanvas}
            onEnd={() => setHasSigned(true)}
            canvasProps={{
              className: 'w-full',
              style: { height: 140, display: 'block' },
            }}
          />
        </div>
        <button
          type="button"
          onClick={clearSignature}
          className="mt-1.5 text-xs text-gray-500 hover:text-gray-700"
        >
          Clear signature
        </button>
      </div>

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={loading || !hasSigned || anyPhotoUploading}
        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {loading
          ? 'Saving…'
          : !hasSigned
          ? 'Please sign first'
          : anyPhotoUploading
          ? 'Wait for photos to upload…'
          : 'Submit Hours'}
      </button>
    </form>
  )
}
