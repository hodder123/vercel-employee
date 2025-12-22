'use client'

import { useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'

export default function InactivityLogout() {
  const pathname = usePathname()
  
  useEffect(() => {
    let timeout

    const resetTimer = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        signOut({ callbackUrl: '/login' })
      }, 5 * 60 * 1000) // 5 minutes
    }

    // Events that count as "activity"
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer)
    })

    resetTimer() // Start the timer

    return () => {
      clearTimeout(timeout)
      events.forEach(event => {
        document.removeEventListener(event, resetTimer)
      })
    }
  }, [pathname])

  return null
}