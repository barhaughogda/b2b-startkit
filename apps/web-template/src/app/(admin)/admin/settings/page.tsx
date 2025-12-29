import { Card, CardContent, CardHeader, CardTitle } from '@startkit/ui'
import { Settings } from 'lucide-react'

/**
 * Settings Admin Page
 * 
 * Configure app admin settings
 */
export default function SettingsAdminPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground">
          Configure app admin settings and preferences
        </p>
      </div>

      {/* Coming soon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Admin Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Admin settings interface coming soon. This will allow you to:
          </p>
          <ul className="mt-4 list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Configure notification preferences</li>
            <li>Set up webhooks for admin events</li>
            <li>Manage API keys for admin access</li>
            <li>Configure audit log retention</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
