'use client';

import React from 'react';
import Link from 'next/link';
import { TenantBranding } from '@/components/patient/TenantBranding';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LayoutDashboard, 
  Calendar, 
  FileText, 
  MessageSquare, 
  User,
  Shield,
  Heart
} from 'lucide-react';

export default function PatientPortalPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <TenantBranding 
              tenantId="demo-tenant"
              size="lg"
            />
            <div className="flex items-center gap-4">
              <Button variant="outline" asChild>
                <Link href="/patient/login?callbackUrl=/patient/calendar?tab=today">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/patient/register">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Your Health, 
            <span className="text-tenant-primary"> Your Control</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Access your medical records, schedule appointments, and communicate 
            securely with your healthcare providers all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/patient/login?callbackUrl=/patient/calendar?tab=today">Sign In to Portal</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/patient/register">Request Access</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Everything You Need for Your Healthcare
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our patient portal provides secure access to all your health information 
              and tools to manage your care effectively.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Health Dashboard</CardTitle>
                <CardDescription>
                  Get a comprehensive overview of your health status, upcoming appointments, 
                  and important notifications.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="p-3 bg-blue-100 rounded-lg w-fit mb-4">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Medical Records</CardTitle>
                <CardDescription>
                  Access your complete medical history, test results, prescriptions, 
                  and treatment plans securely.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="p-3 bg-green-100 rounded-lg w-fit mb-4">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Appointment Management</CardTitle>
                <CardDescription>
                  Schedule, reschedule, or cancel appointments with your healthcare 
                  providers at your convenience.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="p-3 bg-purple-100 rounded-lg w-fit mb-4">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Secure Messaging</CardTitle>
                <CardDescription>
                  Communicate directly with your care team through encrypted, 
                  HIPAA-compliant messaging.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="p-3 bg-orange-100 rounded-lg w-fit mb-4">
                  <User className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>Profile Management</CardTitle>
                <CardDescription>
                  Keep your personal information, insurance details, and emergency 
                  contacts up to date.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="p-3 bg-red-100 rounded-lg w-fit mb-4">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle>Privacy & Security</CardTitle>
                <CardDescription>
                  Your health information is protected with bank-level security 
                  and HIPAA compliance.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <Heart className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Your Privacy is Our Priority
          </h2>
          <p className="text-muted-foreground mb-8">
            We use industry-leading security measures to protect your health information. 
            All data is encrypted and stored securely, with full HIPAA compliance.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              HIPAA Compliant
            </span>
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              256-bit Encryption
            </span>
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Secure Authentication
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8 px-4">
        <div className="container mx-auto text-center">
          <TenantBranding 
            tenantId="demo-tenant"
            size="md"
            className="justify-center mb-4"
          />
          <p className="text-muted-foreground text-sm">
            © 2024 Medical Practice. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}