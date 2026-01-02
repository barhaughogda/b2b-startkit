import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: string;
}

// Healthcare status components using Zenthea semantic color system
export function PatientStatus({ 
  className, 
  children, 
  status = 'active',
  ...props 
}: StatusProps) {
  const statusClasses = {
    active: "bg-healthcare-patient/10 text-healthcare-patient hover:bg-healthcare-patient/20",
    inactive: "bg-healthcare-patient-inactive/10 text-healthcare-patient-inactive hover:bg-healthcare-patient-inactive/20",
    discharged: "bg-healthcare-patient-discharged/10 text-healthcare-patient-discharged hover:bg-healthcare-patient-discharged/20",
  }[status as keyof typeof statusClasses] || "bg-healthcare-patient/10 text-healthcare-patient";

  return (
    <Badge 
      variant="secondary" 
      className={cn(statusClasses, className)}
      {...props}
    >
      {children}
    </Badge>
  );
}

export function AppointmentStatus({ 
  className, 
  children, 
  status = 'scheduled',
  ...props 
}: StatusProps) {
  const statusClasses = {
    scheduled: "bg-healthcare-appointment/10 text-healthcare-appointment hover:bg-healthcare-appointment/20",
    confirmed: "bg-healthcare-appointment-confirmed/10 text-healthcare-appointment-confirmed hover:bg-healthcare-appointment-confirmed/20",
    cancelled: "bg-healthcare-appointment-cancelled/10 text-healthcare-appointment-cancelled hover:bg-healthcare-appointment-cancelled/20",
  }[status as keyof typeof statusClasses] || "bg-healthcare-appointment/10 text-healthcare-appointment";

  return (
    <Badge 
      variant="secondary" 
      className={cn(statusClasses, className)}
      {...props}
    >
      {children}
    </Badge>
  );
}

export function VitalStatus({ 
  className, 
  children, 
  status = 'normal',
  ...props 
}: StatusProps) {
  const statusClasses = {
    normal: "bg-healthcare-vital-normal/10 text-healthcare-vital-normal hover:bg-healthcare-vital-normal/20",
    elevated: "bg-healthcare-vital-elevated/10 text-healthcare-vital-elevated hover:bg-healthcare-vital-elevated/20",
    critical: "bg-healthcare-vital-critical/10 text-healthcare-vital-critical hover:bg-healthcare-vital-critical/20",
  }[status as keyof typeof statusClasses] || "bg-healthcare-vital/10 text-healthcare-vital";

  return (
    <Badge 
      variant="secondary" 
      className={cn(statusClasses, className)}
      {...props}
    >
      {children}
    </Badge>
  );
}

export function LabStatus({ 
  className, 
  children, 
  status = 'normal',
  ...props 
}: StatusProps) {
  const statusClasses = {
    normal: "bg-healthcare-lab-normal/10 text-healthcare-lab-normal hover:bg-healthcare-lab-normal/20",
    abnormal: "bg-healthcare-lab-abnormal/10 text-healthcare-lab-abnormal hover:bg-healthcare-lab-abnormal/20",
    critical: "bg-healthcare-lab-critical/10 text-healthcare-lab-critical hover:bg-healthcare-lab-critical/20",
  }[status as keyof typeof statusClasses] || "bg-healthcare-lab-pending/10 text-healthcare-lab-pending";

  return (
    <Badge 
      variant="secondary" 
      className={cn(statusClasses, className)}
      {...props}
    >
      {children}
    </Badge>
  );
}

export function AlertSeverity({ 
  className, 
  children, 
  status = 'info',
  ...props 
}: StatusProps) {
  const statusClasses = {
    info: "bg-healthcare-alert-info/10 text-healthcare-alert-info hover:bg-healthcare-alert-info/20",
    warning: "bg-healthcare-alert-warning/10 text-healthcare-alert-warning hover:bg-healthcare-alert-warning/20",
    error: "bg-healthcare-alert-error/10 text-healthcare-alert-error hover:bg-healthcare-alert-error/20",
    critical: "bg-healthcare-alert-critical/10 text-healthcare-alert-critical hover:bg-healthcare-alert-critical/20",
  }[status as keyof typeof statusClasses] || "bg-healthcare-alert-info/10 text-healthcare-alert-info";

  return (
    <Badge 
      variant="secondary" 
      className={cn(statusClasses, className)}
      {...props}
    >
      {children}
    </Badge>
  );
}

export function TreatmentStatus({ 
  className, 
  children, 
  status = 'active',
  ...props 
}: StatusProps) {
  const statusClasses = {
    active: "bg-healthcare-treatment-active/10 text-healthcare-treatment-active hover:bg-healthcare-treatment-active/20",
    completed: "bg-healthcare-treatment-completed/10 text-healthcare-treatment-completed hover:bg-healthcare-treatment-completed/20",
  }[status as keyof typeof statusClasses] || "bg-healthcare-treatment-pending/10 text-healthcare-treatment-pending";

  return (
    <Badge 
      variant="secondary" 
      className={cn(statusClasses, className)}
      {...props}
    >
      {children}
    </Badge>
  );
}

export function InsuranceStatus({ 
  className, 
  children, 
  status = 'active',
  ...props 
}: StatusProps) {
  const statusClasses = {
    active: "bg-healthcare-insurance-active/10 text-healthcare-insurance-active hover:bg-healthcare-insurance-active/20",
    pending: "bg-healthcare-insurance-pending/10 text-healthcare-insurance-pending hover:bg-healthcare-insurance-pending/20",
    expired: "bg-healthcare-insurance-expired/10 text-healthcare-insurance-expired hover:bg-healthcare-insurance-expired/20",
  }[status as keyof typeof statusClasses] || "bg-healthcare-insurance-active/10 text-healthcare-insurance-active";

  return (
    <Badge 
      variant="outline" 
      className={cn(statusClasses, className)}
      {...props}
    >
      {children}
    </Badge>
  );
}
