'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MessageSquare, Phone, Mail } from 'lucide-react';
import Link from 'next/link';

interface ProviderContactActionsProps {
  providerId: string;
  onScheduleClick?: () => void;
  onMessageClick?: () => void;
  scheduleUrl?: string;
  messageUrl?: string;
  phone?: string;
  email?: string;
  showPhone?: boolean;
  showEmail?: boolean;
}

export function ProviderContactActions({
  providerId,
  onScheduleClick,
  onMessageClick,
  scheduleUrl,
  messageUrl,
  phone,
  email,
  showPhone = false,
  showEmail = false
}: ProviderContactActionsProps) {
  const hasActions = onScheduleClick || onMessageClick || scheduleUrl || messageUrl || (showPhone && phone) || (showEmail && email);
  
  if (!hasActions) {
    return null;
  }
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          {/* Primary Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {onScheduleClick ? (
              <Button
                onClick={onScheduleClick}
                className="flex-1"
                size="lg"
              >
                <Calendar className="h-5 w-5 mr-2" />
                Schedule Appointment
              </Button>
            ) : scheduleUrl ? (
              <Button
                asChild
                className="flex-1"
                size="lg"
              >
                <Link href={scheduleUrl}>
                  <Calendar className="h-5 w-5 mr-2" />
                  Schedule Appointment
                </Link>
              </Button>
            ) : null}
            
            {onMessageClick ? (
              <Button
                onClick={onMessageClick}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Send Message
              </Button>
            ) : messageUrl ? (
              <Button
                asChild
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <Link href={messageUrl}>
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Send Message
                </Link>
              </Button>
            ) : null}
          </div>
          
          {/* Contact Information */}
          {(showPhone && phone) || (showEmail && email) ? (
            <div className="pt-3 border-t border-border-primary space-y-2">
              {showPhone && phone && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${phone}`} className="hover:text-text-primary">
                    {phone}
                  </a>
                </div>
              )}
              {showEmail && email && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${email}`} className="hover:text-text-primary">
                    {email}
                  </a>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

