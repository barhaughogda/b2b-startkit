import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@startkit/database';
import { organizations } from '@startkit/database/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@startkit/ui/components/card';
import { Button } from '@startkit/ui/components/button';
import { Input } from '@startkit/ui/components/input';
import { Label } from '@startkit/ui/components/label';
import { Textarea } from '@startkit/ui/components/textarea';
import { Calendar, ShieldCheck } from 'lucide-react';

import { submitBookingRequest } from './actions';

interface BookingPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { slug } = await params;
  
  // Create a bound action for the form
  const action = submitBookingRequest.bind(null, slug);

  // Fetch organization by slug
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });

  if (!org) {
    notFound();
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Branding / Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-teal-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Book an Appointment</h1>
          <p className="text-slate-600">Secure booking for {org.name}</p>
        </div>

        <Card className="border-teal-100 shadow-sm">
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
            <CardDescription>
              Please provide your details. This information is encrypted and handled securely.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="patientName">Full Name</Label>
                <Input id="patientName" name="patientName" placeholder="Jane Doe" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientEmail">Email Address</Label>
                <Input id="patientEmail" name="patientEmail" type="email" placeholder="jane@example.com" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientPhone">Phone Number</Label>
                <Input id="patientPhone" name="patientPhone" type="tel" placeholder="(555) 000-0000" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Reason for Visit</Label>
                <Textarea id="notes" name="notes" placeholder="Please briefly describe why you'd like to book an appointment..." rows={4} />
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                  Submit Booking Request
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-4">
                <ShieldCheck className="h-3 w-3" />
                <span>HIPAA Compliant & Secure</span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
