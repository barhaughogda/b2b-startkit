'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PatientTestimonial } from '@/types';
import { Star, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProviderTestimonialsProps {
  testimonials: PatientTestimonial[];
  showAll?: boolean;
  limit?: number;
}

export function ProviderTestimonials({
  testimonials,
  showAll = false,
  limit = 5
}: ProviderTestimonialsProps) {
  const displayTestimonials = showAll ? testimonials : testimonials.slice(0, limit);
  
  if (testimonials.length === 0) {
    return null;
  }
  
  const averageRating = testimonials.length > 0
    ? testimonials.reduce((sum, t) => sum + t.rating, 0) / testimonials.length
    : 0;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Patient Testimonials</CardTitle>
            <CardDescription>
              {testimonials.length} {testimonials.length === 1 ? 'review' : 'reviews'}
              {averageRating > 0 && (
                <span className="ml-2">
                  • {averageRating.toFixed(1)} <Star className="inline h-3 w-3 fill-yellow-400 text-yellow-400" />
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayTestimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className="p-4 bg-background-secondary rounded-lg border border-border-primary"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-text-primary">
                    {testimonial.patientFirstName}
                    {testimonial.patientLastNameInitial && ` ${testimonial.patientLastNameInitial}.`}
                  </span>
                  {testimonial.isVerified && (
                    <CheckCircle2 className="h-4 w-4 text-status-success" />
                  )}
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= testimonial.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-text-tertiary'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <p className="text-text-primary text-sm leading-relaxed">
              {testimonial.comment}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {testimonial.isVerified && (
                <Badge variant="outline" className="text-xs">
                  Verified Patient
                </Badge>
              )}
              <span className="text-xs text-text-tertiary">
                {new Date(testimonial.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
        
        {!showAll && testimonials.length > limit && (
          <div className="text-center pt-2">
            <p className="text-sm text-text-secondary">
              Showing {limit} of {testimonials.length} testimonials
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

