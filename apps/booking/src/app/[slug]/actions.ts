'use server';

import { db } from '@startkit/database';
import { bookingRequests, organizations } from '@startkit/database/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const bookingSchema = z.object({
  patientName: z.string().min(2, "Name is required"),
  patientEmail: z.string().email("Invalid email address"),
  patientPhone: z.string().optional(),
  notes: z.string().optional(),
  preferredDates: z.array(z.string()).min(1, "Select at least one date"),
});

export async function submitBookingRequest(slug: string, formData: FormData) {
  // 1. Fetch organization
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });

  if (!org) {
    throw new Error("Organization not found");
  }

  // 2. Validate data
  const preferredDate = formData.get('preferredDate') as string;
  const rawData = {
    patientName: formData.get('patientName') as string,
    patientEmail: formData.get('patientEmail') as string,
    patientPhone: formData.get('patientPhone') as string,
    notes: formData.get('notes') as string,
    preferredDates: preferredDate ? [preferredDate] : [],
  };

  const validatedData = bookingSchema.parse(rawData);

  // 3. Insert into database
  await db.insert(bookingRequests).values({
    id: uuidv4(),
    organizationId: org.id,
    patientName: validatedData.patientName,
    patientEmail: validatedData.patientEmail,
    patientPhone: validatedData.patientPhone,
    notes: validatedData.notes,
    preferredDates: validatedData.preferredDates,
    status: 'pending',
    source: 'web_booking_app',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 4. Redirect to confirmation
  redirect(`/${slug}/confirm`);
}
