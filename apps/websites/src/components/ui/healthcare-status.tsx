import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Simple status components using standard shadcn Badge
export function PatientStatus({ 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <Badge 
      variant="secondary" 
      className={cn("bg-green-100 text-green-800 hover:bg-green-200", className)}
      {...props}
    >
      {children}
    </Badge>
  );
}

export function AppointmentStatus({ 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <Badge 
      variant="secondary" 
      className={cn("bg-blue-100 text-blue-800 hover:bg-blue-200", className)}
      {...props}
    >
      {children}
    </Badge>
  );
}

export function VitalStatus({ 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <Badge 
      variant="secondary" 
      className={cn("bg-red-100 text-red-800 hover:bg-red-200", className)}
      {...props}
    >
      {children}
    </Badge>
  );
}

export function LabStatus({ 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <Badge 
      variant="secondary" 
      className={cn("bg-purple-100 text-purple-800 hover:bg-purple-200", className)}
      {...props}
    >
      {children}
    </Badge>
  );
}

export function AlertSeverity({ 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <Badge 
      variant="destructive" 
      className={cn("bg-red-100 text-red-800 hover:bg-red-200", className)}
      {...props}
    >
      {children}
    </Badge>
  );
}

export function TreatmentStatus({ 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <Badge 
      variant="secondary" 
      className={cn("bg-yellow-100 text-yellow-800 hover:bg-yellow-200", className)}
      {...props}
    >
      {children}
    </Badge>
  );
}

export function InsuranceStatus({ 
  className, 
  children, 
  ...props 
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <Badge 
      variant="outline" 
      className={cn("bg-gray-100 text-gray-800 hover:bg-gray-200", className)}
      {...props}
    >
      {children}
    </Badge>
  );
}