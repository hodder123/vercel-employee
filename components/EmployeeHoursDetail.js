'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function EmployeeHoursDetail({ employee, workHours }) {
  const [filter, setFilter] = useState('all') // all, week, month

  const parseProjects = (projects) => {
    try {
      if (typeof projects === 'string') {
        return JSON.parse(projects)
      }
      return projects || []
    } catch {
      return []
    }
  }

  // Filter work hours based on selected filter
  const filteredHours = workHours.filter(entry => {
    if (filter === 'all') return true
    
    const entryDate = new Date(entry.date)
    const now = new Date()
    
    if (filter === 'week') {
      const weekAgo = new Date(now.setDate(now.getDate() - 7))
      return entryDate >= weekAgo
    }
    
    if (filter === 'month') {
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1))
      return entryDate >= monthAgo
    }
    
    return true
  })

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Time ({workHours.length})
          </button>
          <button
            onClick={() => setFilter('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 7 Days
          </button>
        </div>
      </div>

      {/* Work Hours List */}
      {filteredHours.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <p className="text-gray-600">No work hours found for this period</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHours.map((entry) => {
            const projects = parseProjects(entry.projects)
            
            return (
              <div key={entry.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(entry.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Total: <span className="font-semibold text-blue-600">{entry.hoursWorked}h</span>
                      </p>
                    </div>
                    <Link
                      href={`/admin/edit-hours/${entry.id}`}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                    >
                      Edit Entry
                    </Link>
                  </div>

                  {/* Projects */}
                  {projects.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {projects.map((project, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900">{project.name}</h4>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {project.hours || 0}h
                            </span>
                          </div>
                          {project.location && (
                            <p className="text-sm text-gray-600 mb-1">
                              📍 {project.location}
                            </p>
                          )}
                          {project.description && (
                            <p className="text-sm text-gray-600">{project.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-sm">{entry.description || 'No description'}</p>
                  )}

                  {/* Signature */}
                  {entry.signature && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-2">Digital Signature:</p>
                      <img 
                        src={entry.signature} 
                        alt="Signature" 
                        className="h-16 sm:h-20 border border-gray-300 rounded bg-white p-2"
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}