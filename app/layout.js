import { Rubik } from 'next/font/google'
import './globals.css'
import InactivityLogout from '@/components/InactivityLogout'

const rubik = Rubik({ subsets: ['latin'] })

export const metadata = {
  title: 'Employee Timesheet',
  description: 'Employee time tracking system',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={rubik.className}>
        <InactivityLogout />
        {children}
      </body>
    </html>
  )
}
