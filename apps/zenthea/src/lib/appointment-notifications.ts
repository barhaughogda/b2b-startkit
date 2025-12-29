/**
 * Client-side utility for sending appointment notifications
 * This calls the API route which handles email/SMS delivery
 */

interface AppointmentNotificationParams {
  type: 'invite' | 'update' | 'cancel' | 'reminder';
  recipients: Array<{ email: string; name: string }>;
  appointmentDetails: {
    patientName: string;
    date: string;
    time: string;
    duration: number;
    type: string;
    location?: string;
    organizerName?: string;
  };
}

interface NotificationResult {
  success: boolean;
  sent?: number;
  failed?: number;
  errors?: string[];
  error?: string;
}

/**
 * Send appointment notifications to recipients
 * This is called after appointment mutations to notify relevant users
 */
export async function sendAppointmentNotifications(
  params: AppointmentNotificationParams
): Promise<NotificationResult> {
  try {
    const response = await fetch('/api/appointments/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `HTTP error ${response.status}`,
      };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[sendAppointmentNotifications] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send notifications',
    };
  }
}

/**
 * Format a timestamp to a readable date string
 */
export function formatAppointmentDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format a timestamp to a readable time string
 */
export function formatAppointmentTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Helper to prepare appointment notification data
 */
export function prepareAppointmentNotification(
  type: 'invite' | 'update' | 'cancel' | 'reminder',
  appointment: {
    scheduledAt: number;
    duration: number;
    type: string;
    location?: string;
  },
  patientName: string,
  organizerName?: string,
  recipients: Array<{ email: string; name: string }> = []
): AppointmentNotificationParams {
  return {
    type,
    recipients,
    appointmentDetails: {
      patientName,
      date: formatAppointmentDate(appointment.scheduledAt),
      time: formatAppointmentTime(appointment.scheduledAt),
      duration: appointment.duration,
      type: appointment.type,
      location: appointment.location,
      organizerName,
    },
  };
}

