import React from 'react';
import { db } from '@startkit/database';
import { organizations } from '@startkit/database/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Card, CardContent } from '@startkit/ui/components/card';
import { Button } from '@startkit/ui/components/button';
import { CheckCircle, Home } from 'lucide-react';
import Link from 'next/link';

interface ConfirmPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ConfirmPage({ params }: ConfirmPageProps) {
  const { slug } = await params;

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });

  if (!org) {
    notFound();
  }

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-zenthea-teal/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-zenthea-teal" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Request Received!</h1>
        <p className="text-slate-600 mb-8">
          Thank you for choosing {org.name}. Our team will review your request and contact you shortly.
        </p>

        <Card className="mb-8">
          <CardContent className="pt-6 text-left">
            <h3 className="font-semibold text-slate-900 mb-2 text-sm uppercase tracking-wider">Next Steps</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-2">
                <span className="font-bold text-zenthea-teal">1.</span>
                <span>Our clinical staff will review your availability preferences.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-zenthea-teal">2.</span>
                <span>You'll receive an email or call to confirm the final time slot.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-zenthea-teal">3.</span>
                <span>Instructions for your visit will be provided upon confirmation.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Link href="/">
          <Button variant="outline" className="w-full">
            <Home className="mr-2 h-4 w-4" />
            Return to Homepage
          </Button>
        </Link>
      </div>
    </div>
  );
}
