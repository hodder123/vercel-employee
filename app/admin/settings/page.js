import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import ChangeOwnPasswordForm from '@/components/admin/ChangeOwnPasswordForm'
import { Settings } from 'lucide-react'

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your admin account</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Change My Password
          </CardTitle>
          <CardDescription>
            Update your admin account password. You will need to provide your current password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangeOwnPasswordForm username={session.user.name} />
        </CardContent>
      </Card>
    </div>
  )
}
