'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AllWorkHoursDashboard({ 
  employees, 
  totalHours, 
  totalEntries, 
  activeEmployees,
  avgHoursPerEmployee,
  currentPeriod 
}) {
  const router = useRouter()
  const [expandedEmployee, setExpandedEmployee] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter employees by search
  const filteredEmployees = employees.filter(emp => 
    emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Sort employees by total hours (descending)
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const aHours = a.workHours.reduce((sum, wh) => sum + wh.hoursWorked, 0)
    const bHours = b.workHours.reduce((sum, wh) => sum + wh.hoursWorked, 0)
    return bHours - aHours
  })

  const handlePeriodChange = (period) => {
    router.push(`/admin/all-work-hours?period=${period}`)
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDay = (date) => {
    return new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Hours */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Hours</p>
              <p className="text-4xl font-bold mt-2">{totalHours.toFixed(1)}</p>
              <p className="text-blue-100 text-xs mt-2">Across all employees</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Entries */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Total Entries</p>
              <p className="text-4xl font-bold mt-2">{totalEntries}</p>
              <p className="text-emerald-100 text-xs mt-2">Time logs recorded</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Employees */}
        <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-violet-100 text-sm font-medium">Active Employees</p>
              <p className="text-4xl font-bold mt-2">{activeEmployees}</p>
              <p className="text-violet-100 text-xs mt-2">Of {employees.length} total</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Average Hours */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-medium">Avg Hours/Employee</p>
              <p className="text-4xl font-bold mt-2">{avgHoursPerEmployee}</p>
              <p className="text-amber-100 text-xs mt-2">Per active employee</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Time Period Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => handlePeriodChange('7')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentPeriod === '7'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handlePeriodChange('30')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentPeriod === '30'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handlePeriodChange('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentPeriod === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Employee Cards */}
      <div className="space-y-4">
        {sortedEmployees.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No work hours found</h3>
            <p className="text-slate-500">
              {searchTerm ? 'Try adjusting your search terms' : 'No hours logged in this time period'}
            </p>
          </div>
        ) : (
          sortedEmployees.map((employee) => {
            const employeeHours = employee.workHours.reduce((sum, wh) => sum + wh.hoursWorked, 0)
            const isExpanded = expandedEmployee === employee.id

            return (
              <div key={employee.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all">
                {/* Employee Header */}
                <div 
                  className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedEmployee(isExpanded ? null : employee.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md">
                        {employee.fullName?.charAt(0) || employee.name?.charAt(0) || 'E'}
                      </div>
                      
                      {/* Employee Info */}
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">
                          {employee.fullName || employee.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-slate-600">
                            {employee.workHours.length} {employee.workHours.length === 1 ? 'entry' : 'entries'}
                          </span>
                          {employee.department && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-sm text-slate-600">{employee.department}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center gap-6">
                      {/* Total Hours Badge */}
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">
                          {employeeHours.toFixed(1)}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">TOTAL HOURS</div>
                      </div>

                      {/* Expand/Collapse Icon */}
                      <div className="flex gap-2">
                        
                          href={`/admin/employee/${employee.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View Details"
                        <a>
                          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <svg 
                          className={`w-6 h-6 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && employee.workHours.length > 0 && (
                  <div className="border-t border-slate-200 bg-slate-50">
                    <div className="p-6">
                      <h4 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Recent Entries</h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {employee.workHours.slice(0, 10).map((entry) => {
                          const projects = (() => {
                            try {
                              if (typeof entry.projects === 'string') {
                                return JSON.parse(entry.projects)
                              }
                              return entry.projects || []
                            } catch {
                              return []
                            }
                          })()

                          return (
                            <div key={entry.id} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="text-sm font-semibold text-slate-900">
                                      {formatDate(entry.date)}
                                    </span>
                                    <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-md font-medium">
                                      {formatDay(entry.date)}
                                    </span>
                                    <span className="text-lg font-bold text-blue-600">
                                      {entry.hoursWorked}h
                                    </span>
                                  </div>
                                  
                                  {projects.length > 0 && (
                                    <div className="space-y-1 mb-2">
                                      {projects.map((project, idx) => (
                                        <div key={idx} className="text-sm text-slate-700 flex items-center gap-2">
                                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                          <span className="font-medium">{project.name}</span>
                                          {project.location && (
                                            <span className="text-slate-500">@ {project.location}</span>
                                          )}
                                          {project.hours && (
                                            <span className="text-blue-600 font-semibold">({project.hours}h)</span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {entry.description && (
                                    <p className="text-sm text-slate-600 line-clamp-2">
                                      {entry.description}
                                    </p>
                                  )}
                                </div>

                                <div className="flex gap-2 ml-4">
                                  {entry.signature && entry.signature !== 'admin-added' && (
                                    <div className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-md">
                                      ✓ Signed
                                    </div>
                                  )}
                                  
                                    href={`/admin/edit-hours/${entry.id}`}
                                    className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                                    title="Edit Entry"
                                  <a>
                                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </a>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      
                      {employee.workHours.length > 10 && (
                        <div className="mt-4 text-center">
                          
                            href={`/admin/employee/${employee.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                          <a>
                            View All {employee.workHours.length} Entries
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}