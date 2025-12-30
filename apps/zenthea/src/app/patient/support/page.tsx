'use client';

import React from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import Link from 'next/link';
import { TenantBranding } from '@/components/patient/TenantBranding';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, ArrowLeft } from 'lucide-react';

export default function PatientSupportPage() {
  const { data: session } = useZentheaSession();
  const tenantId = session?.user?.tenantId || 'demo-tenant';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <TenantBranding 
            tenantId={tenantId}
            size="lg"
            className="justify-center mb-6"
          />
          <h1 className="text-3xl font-bold text-foreground">
            Contact Support
          </h1>
          <p className="text-muted-foreground mt-2">
            We&apos;re here to help you with any questions or issues
          </p>
        </div>

        {/* Support Options */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-zenthea-teal" />
                Email Support
              </CardTitle>
              <CardDescription>
                Send us an email and we&apos;ll get back to you within 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a 
                href="mailto:support@zenthea.com"
                className="text-zenthea-teal hover:underline font-medium"
              >
                support@zenthea.com
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-zenthea-teal" />
                Phone Support
              </CardTitle>
              <CardDescription>
                Call us during business hours (9 AM - 5 PM EST)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a 
                href="tel:+1-800-ZENTHEA"
                className="text-zenthea-teal hover:underline font-medium"
              >
                1-800-ZENTHEA
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Common Issues */}
        <Card>
          <CardHeader>
            <CardTitle>Common Issues</CardTitle>
            <CardDescription>
              Quick solutions to frequently asked questions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Can&apos;t log in?
              </h3>
              <p className="text-sm text-muted-foreground">
                Make sure you&apos;re using the correct email and password. 
                If you&apos;ve forgotten your password, you can reset it from the login page.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Need to update your information?
              </h3>
              <p className="text-sm text-muted-foreground">
                You can update your profile information from your patient dashboard 
                after logging in.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">
                Technical issues?
              </h3>
              <p className="text-sm text-muted-foreground">
                Try clearing your browser cache or using a different browser. 
                If the issue persists, contact our support team.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/patient/login">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

