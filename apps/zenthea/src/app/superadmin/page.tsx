"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  Image as ImageIcon, 
  Users, 
  Database,
  Shield,
  ExternalLink,
  Building2
} from "lucide-react";
import Link from "next/link";
import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";
import { PlatformStatsCards } from "@/components/superadmin/PlatformStatsCards";
import { RecentActivityFeed } from "@/components/superadmin/RecentActivityFeed";

export default function SuperAdminDashboard() {
  return (
    <SuperAdminLayout>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Super Admin Dashboard
          </h1>
          <p className="text-text-secondary">
            Manage system-wide settings and configurations
          </p>
        </div>

        {/* Platform Statistics */}
        <PlatformStatsCards />

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Image Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-zenthea-teal" />
                Image Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary mb-4">
                Upload and manage hero images for the landing page
              </p>
              <Link href="/superadmin/image-uploader">
                <Button className="w-full bg-zenthea-teal hover:bg-zenthea-teal-600">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Manage Images
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Logo Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-zenthea-purple" />
                Logo Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary mb-4">
                Upload and manage logos for the landing page
              </p>
              <Link href="/superadmin/logo-uploader">
                <Button className="w-full bg-zenthea-purple hover:bg-zenthea-purple-600">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Manage Logos
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Tenant Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-status-info" />
                Tenant Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary mb-4">
                View and manage all tenants in the Zenthea platform
              </p>
              <Link href="/superadmin/tenants">
                <Button className="w-full bg-zenthea-teal hover:bg-zenthea-teal-600">
                  <Building2 className="h-4 w-4 mr-2" />
                  Manage Tenants
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-status-info" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary mb-4">
                Manage users, roles, and permissions across the system
              </p>
              <Button variant="outline" className="w-full" disabled>
                <Users className="h-4 w-4 mr-2" />
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          {/* Platform Settings */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-status-success" />
                Platform Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary mb-4">
                Configure platform-wide security policies, integrations, and defaults
              </p>
              <Link href="/superadmin/settings">
                <Button className="w-full bg-zenthea-purple hover:bg-zenthea-purple-600">
                  <Settings className="h-4 w-4 mr-2" />
                  Platform Settings
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Database Management */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-zenthea-purple" />
                Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary mb-4">
                Monitor database performance and manage data
              </p>
              <Button variant="outline" className="w-full" disabled>
                <Database className="h-4 w-4 mr-2" />
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-status-error" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary mb-4">
                Security monitoring and access control
              </p>
              <Button variant="outline" className="w-full" disabled>
                <Shield className="h-4 w-4 mr-2" />
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          {/* External Links */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-zenthea-coral" />
                Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open('/', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Landing Page
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open('/auth/signin', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Login Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Feed */}
        <RecentActivityFeed />
      </div>
    </SuperAdminLayout>
  );
}
