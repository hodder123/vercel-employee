'use client'

import { useState } from 'react'
import AdminSidebar from './AdminSidebar'
import AdminTopBar from './AdminTopBar'

export default function AdminLayoutClient({ children, user }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile, shown on lg+ */}
      <div className="hidden lg:flex">
        <AdminSidebar />
      </div>

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <AdminSidebar />
      </div>

      {/* Main area */}
      <div className="relative flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-amber-50 via-white to-sky-50">
        <div className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_45%)]" />
        <AdminTopBar user={user} onToggleMobile={() => setMobileOpen(!mobileOpen)} />
        <main className="relative flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
