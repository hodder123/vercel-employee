import { Inter } from 'next/font/google'
import './globals.css'
import InactivityLogout from '@/components/InactivityLogout'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Employee Timesheet',
  description: 'Employee time tracking system',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <InactivityLogout />
        {children}
      </body>
    </html>
  )
}