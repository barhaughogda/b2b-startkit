'use client';

import React, { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { CareTeamCard } from '@/components/patient/dashboard/CareTeamCard';
import { DashboardAppointmentsWidget } from '@/components/patient/dashboard/DashboardAppointmentsWidget';
import { DashboardPrescriptionsWidget } from '@/components/patient/dashboard/DashboardPrescriptionsWidget';
import { DashboardMessagesWidget } from '@/components/patient/dashboard/DashboardMessagesWidget';
import { useAppointments, ConvexAppointment } from '@/hooks/useAppointments';
import { usePatientProfileData } from '@/hooks/usePatientProfileData';
import { useCardSystem } from '@/components/cards/CardSystemProvider';
import { CardType, Priority, TaskStatus } from '@/components/cards/types';
import { transformMessageToCardData } from '@/lib/utils/messageDataTransform';

export function PatientDashboardContent() {
  const { data: session } = useSession();
  const tenantId = session?.user?.tenantId || 'demo-tenant';
  const sessionUserId = session?.user?.id;
  const { openCard } = useCardSystem();
  
  // Check if userId is a valid Convex ID format
  const isValidConvexId = sessionUserId && typeof sessionUserId === 'string' && /^[jk][a-z0-9]{15,}$/.test(sessionUserId);
  const userId = isValidConvexId ? (sessionUserId as Id<'users'>) : undefined;

  // Fetch appointments using hook
  const { appointments: convexAppointments, isLoading: appointmentsLoading } = useAppointments('all');

  // Fetch patient profile for medications
  const { patientId, patientProfile, isLoading: profileLoading } = usePatientProfileData();

  // Fetch recent messages/conversations
  const conversations = useQuery(
    api.messages.getConversations,
    userId && tenantId ? {
      tenantId,
      userId,
      limit: 10 // Get more than we need for recent messages
    } : 'skip'
  );

  // Transform appointments for widget
  const upcomingAppointments = useMemo(() => {
    if (!convexAppointments || convexAppointments.length === 0) {
      return [];
    }

    // Filter to upcoming appointments (scheduled or confirmed, in the future)
    const now = Date.now();
    const upcoming = convexAppointments
      .filter((apt: ConvexAppointment) => {
        const scheduledTime = apt.scheduledAt;
        const isUpcoming = scheduledTime > now;
        const isScheduledOrConfirmed = apt.status === 'scheduled' || apt.status === 'confirmed';
        return isUpcoming && isScheduledOrConfirmed;
      })
      .sort((a: ConvexAppointment, b: ConvexAppointment) => a.scheduledAt - b.scheduledAt)
      .slice(0, 2); // Take top 2

    return upcoming.map((apt: ConvexAppointment) => {
      const scheduledDate = new Date(apt.scheduledAt);
      const dateStr = scheduledDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      const timeStr = scheduledDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      return {
        id: apt._id,
        date: dateStr,
        time: timeStr,
        provider: apt.providerName || 'Unknown Provider',
        type: apt.type || 'Appointment',
        status: apt.status,
      };
    });
  }, [convexAppointments]);

  // Transform medications to prescriptions for widget
  const prescriptions = useMemo(() => {
    if (!patientProfile?.medications || patientProfile.medications.length === 0) {
      return [];
    }

    return patientProfile.medications.map((medication: {
      name: string;
      dosage: string;
      frequency: string;
      route: string;
      prescribedBy?: string;
      startDate: string;
      indication?: string;
      notes?: string;
    }, index: number) => ({
      id: `med-${index}`,
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      prescriber: medication.prescribedBy,
      startDate: medication.startDate,
      status: 'active', // Default status for current medications
    }));
  }, [patientProfile]);

  // Transform messages for widget
  const recentMessages = useMemo(() => {
    if (!conversations || conversations.length === 0) {
      return [];
    }

    // Sort by last message time and take most recent 2
    const sorted = [...conversations]
      .sort((a, b) => {
        const timeA = a.lastMessage?.createdAt || 0;
        const timeB = b.lastMessage?.createdAt || 0;
        return timeB - timeA;
      })
      .slice(0, 2);

    return sorted.map((conv) => {
      const lastMessage = conv.lastMessage;
      const otherUser = conv.otherUser;
      const fromName = otherUser 
        ? `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() || otherUser.email || 'Care Team'
        : 'Care Team';
      const subject = lastMessage?.content?.substring(0, 50) || 'New message';
      const createdAt = lastMessage?.createdAt ? new Date(lastMessage.createdAt) : new Date();
      
      // Format relative time
      const now = Date.now();
      const diffMs = now - createdAt.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      let dateStr = '';
      if (diffHours < 1) {
        dateStr = 'Just now';
      } else if (diffHours < 24) {
        dateStr = `${diffHours}h ago`;
      } else if (diffDays === 1) {
        dateStr = '1d ago';
      } else {
        dateStr = `${diffDays}d ago`;
      }

      return {
        id: conv.threadId,
        from: fromName,
        subject,
        date: dateStr,
        unread: conv.unreadCount > 0,
      };
    });
  }, [conversations]);

  // Handle appointment click - opens AppointmentCard via main card system
  const handleAppointmentClick = (appointment: { id: number | string; date: string; time: string; provider: string; type: string; status: string }) => {
    // Find the full appointment data from convexAppointments
    const fullAppointment = convexAppointments?.find((apt: ConvexAppointment) => apt._id === appointment.id);
    
    if (!fullAppointment) {
      console.error('Appointment not found:', appointment.id);
      return;
    }

    // Transform appointment data for AppointmentCard
    const scheduledDate = new Date(fullAppointment.scheduledAt);
    const dateStr = scheduledDate.toISOString().split('T')[0]!;
    const timeStr = scheduledDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });

    const appointmentCardData = {
      id: fullAppointment._id,
      patientId: patientId || fullAppointment._id,
      patientName: session?.user?.name || 'Patient',
      time: timeStr,
      date: dateStr,
      duration: fullAppointment.duration || 30,
      type: fullAppointment.type || 'consultation',
      status: fullAppointment.status === 'confirmed' ? 'confirmed' : 
              fullAppointment.status === 'scheduled' ? 'scheduled' :
              fullAppointment.status === 'completed' ? 'completed' :
              fullAppointment.status === 'cancelled' ? 'cancelled' : 'scheduled',
      location: (fullAppointment as unknown as { locationName?: string }).locationName || '',
      locationId: (fullAppointment as unknown as { locationId?: string }).locationId,
      provider: fullAppointment.providerName || 'Unknown Provider',
      providerId: fullAppointment.providerId, // Pass providerId for reschedule modal
      notes: fullAppointment.notes || '',
      mode: 'view' as const,
    };

    // Map status to card status
    const cardStatus: TaskStatus = fullAppointment.status === 'completed' ? 'completed' :
                                   fullAppointment.status === 'cancelled' ? 'cancelled' :
                                   fullAppointment.status === 'confirmed' || fullAppointment.status === 'scheduled' ? 'inProgress' : 'new';

    // Open the card using main card system
    openCard('appointment' as CardType, appointmentCardData, {
      patientId: patientId || fullAppointment._id,
      patientName: session?.user?.name || 'Patient',
      patientDateOfBirth: patientProfile?.dateOfBirth 
        ? new Date(patientProfile.dateOfBirth).toISOString().split('T')[0]! 
        : undefined,
      priority: 'medium' as Priority,
      status: cardStatus,
    });
  };

  // Handle prescription click - opens PrescriptionCard
  const handlePrescriptionClick = (prescription: { id: string; name: string; dosage: string; frequency: string; prescriber?: string; startDate?: string; status?: string }) => {
    // Extract index from id (format: "med-{index}")
    const indexMatch = prescription.id.match(/med-(\d+)/);
    if (!indexMatch || !indexMatch[1] || !patientProfile?.medications) {
      console.error('Prescription not found:', prescription.id);
      return;
    }

    const medicationIndex = parseInt(indexMatch[1], 10);
    const medication = patientProfile.medications[medicationIndex];
    
    if (!medication) {
      console.error('Medication not found at index:', medicationIndex);
      return;
    }

    // Transform medication data to prescription card format
    // Note: We're creating a simplified prescription card with available data
    const prescriptionCardData = {
      id: prescription.id,
      patientId: patientId || prescription.id,
      patientName: session?.user?.name || 'Patient',
      patientDateOfBirth: patientProfile?.dateOfBirth 
        ? new Date(patientProfile.dateOfBirth).toISOString().split('T')[0]! 
        : '',
      medication: {
        name: medication.name,
        genericName: medication.name, // Use same name if generic not available
        strength: medication.dosage,
        form: medication.route || 'oral',
        drugClass: 'Unknown',
        ndc: '',
        manufacturer: 'Unknown',
        controlledSubstance: false,
        schedule: null,
      },
      prescription: {
        status: (prescription.status || 'active') as 'active' | 'discontinued' | 'completed' | 'on-hold',
        dosage: medication.dosage,
        frequency: medication.frequency,
        quantity: 30, // Default quantity
        refills: 0,
        daysSupply: 30,
        startDate: medication.startDate || new Date().toISOString().split('T')[0]!,
        endDate: null,
        instructions: `${medication.dosage} ${medication.frequency}${medication.route ? ` via ${medication.route}` : ''}`,
        indication: medication.indication || 'Not specified',
      },
      prescriber: {
        name: medication.prescribedBy || 'Unknown Provider',
        specialty: '',
        npi: '',
        dea: '',
        phone: '',
        email: '',
      },
      pharmacy: {
        name: 'Not specified',
        address: '',
        phone: '',
        ncpdp: '',
        preferred: false,
      },
      interactions: [],
      allergies: [],
      monitoring: {
        labTests: [],
        vitalSigns: [],
        symptoms: [],
        frequency: '',
        followUp: '',
      },
      refillHistory: [],
      careTeam: [],
      tags: [],
      documents: [],
      comments: [],
    };

    // Map status to card status
    const cardStatus: TaskStatus = prescription.status === 'active' ? 'inProgress' : 'completed';

    // Open the card
    openCard('prescription' as CardType, prescriptionCardData, {
      patientId: patientId || prescription.id,
      patientName: session?.user?.name || 'Patient',
      patientDateOfBirth: patientProfile?.dateOfBirth 
        ? new Date(patientProfile.dateOfBirth).toISOString().split('T')[0]! 
        : undefined,
      priority: 'medium' as Priority,
      status: cardStatus,
    });
  };

  // Handle message click - opens MessageCard
  const handleMessageClick = (message: { id: string | number; from: string; subject: string; date: string; unread: boolean }) => {
    // Find the full conversation data from conversations
    const conversation = conversations?.find((conv) => conv.threadId === message.id);
    
    if (!conversation || !conversation.lastMessage) {
      console.error('Conversation not found:', message.id);
      return;
    }

    const lastMessage = conversation.lastMessage;
    const otherUser = conversation.otherUser;
    
    // Transform to SimpleMessage format for transformMessageToCardData
    const simpleMessage = {
      id: conversation.threadId,
      from: message.from,
      to: session?.user?.name || 'Patient',
      subject: message.subject,
      content: lastMessage.content || '',
      timestamp: lastMessage.createdAt ? new Date(lastMessage.createdAt).toISOString() : new Date().toISOString(),
      isRead: !message.unread,
      priority: 'medium' as 'low' | 'medium' | 'high',
      type: 'incoming' as 'incoming' | 'outgoing',
    };

    // Transform message to card data format
    const messageData = transformMessageToCardData(simpleMessage, patientId || undefined, session?.user?.name || undefined);

    // Map priority and status
    const cardPriority: Priority = 'medium';
    const cardStatus: TaskStatus = message.unread ? 'new' : 'completed';

    // Open the card
    openCard('message' as CardType, messageData as unknown as Record<string, unknown>, {
      patientId: patientId || message.id.toString(),
      patientName: session?.user?.name || 'Patient',
      patientDateOfBirth: patientProfile?.dateOfBirth 
        ? new Date(patientProfile.dateOfBirth).toISOString().split('T')[0]! 
        : undefined,
      priority: cardPriority,
      status: cardStatus,
    });
  };

  const messagesLoading = !!(userId && tenantId && conversations === undefined);
  const prescriptionsLoading = profileLoading;

  return (
    <div className="space-y-8" data-testid="patient-dashboard">
      {/* First Row: Appointments, Prescriptions, Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardAppointmentsWidget 
          appointments={upcomingAppointments} 
          isLoading={appointmentsLoading}
          onAppointmentClick={handleAppointmentClick}
        />
        <DashboardPrescriptionsWidget 
          prescriptions={prescriptions} 
          isLoading={prescriptionsLoading}
          onPrescriptionClick={handlePrescriptionClick}
        />
        <DashboardMessagesWidget 
          messages={recentMessages} 
          isLoading={messagesLoading}
          onMessageClick={handleMessageClick}
        />
      </div>

      {/* Second Row: Care Team (Full Width) */}
      <div className="grid grid-cols-1 gap-6">
        <CareTeamCard />
      </div>
    </div>
  );
}

