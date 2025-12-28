import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@startkit/ui'
import { Settings, Shield, Database, Bell } from 'lucide-react'

/**
 * Superadmin Settings Page
 */
export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Platform configuration and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Configure platform security options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Impersonation timeout</p>
                <p className="text-sm text-muted-foreground">
                  Maximum duration for impersonation sessions
                </p>
              </div>
              <p className="font-mono text-sm">1 hour</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Audit log retention</p>
                <p className="text-sm text-muted-foreground">
                  How long to keep audit logs
                </p>
              </div>
              <p className="font-mono text-sm">90 days</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Session timeout</p>
                <p className="text-sm text-muted-foreground">
                  Admin session expiration
                </p>
              </div>
              <p className="font-mono text-sm">24 hours</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Database Configuration
            </CardTitle>
            <CardDescription>
              Database connection and performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Connection pool size</p>
                <p className="text-sm text-muted-foreground">
                  Maximum database connections
                </p>
              </div>
              <p className="font-mono text-sm">10</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">RLS Status</p>
                <p className="text-sm text-muted-foreground">
                  Row-level security enforcement
                </p>
              </div>
              <p className="font-mono text-sm text-emerald-400">Enabled</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Provider</p>
                <p className="text-sm text-muted-foreground">
                  Database hosting provider
                </p>
              </div>
              <p className="font-mono text-sm">Supabase</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>
              Alert and notification settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">New user alerts</p>
                <p className="text-sm text-muted-foreground">
                  Email when new users sign up
                </p>
              </div>
              <p className="font-mono text-sm text-muted-foreground">Disabled</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Payment failures</p>
                <p className="text-sm text-muted-foreground">
                  Alert on failed payments
                </p>
              </div>
              <p className="font-mono text-sm text-emerald-400">Enabled</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Security events</p>
                <p className="text-sm text-muted-foreground">
                  Impersonation and admin actions
                </p>
              </div>
              <p className="font-mono text-sm text-emerald-400">Enabled</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Platform Info
            </CardTitle>
            <CardDescription>
              System information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Version</p>
                <p className="text-sm text-muted-foreground">
                  Current platform version
                </p>
              </div>
              <p className="font-mono text-sm">0.1.0</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Environment</p>
                <p className="text-sm text-muted-foreground">
                  Deployment environment
                </p>
              </div>
              <p className="font-mono text-sm">
                {process.env.NODE_ENV || 'development'}
              </p>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Node.js</p>
                <p className="text-sm text-muted-foreground">
                  Runtime version
                </p>
              </div>
              <p className="font-mono text-sm">{process.version}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
