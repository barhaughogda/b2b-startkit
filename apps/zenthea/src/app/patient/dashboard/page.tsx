'use client';

// Force dynamic rendering - this page uses useCardSystem hook which requires CardSystemProvider context
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useConversations } from '@/hooks/useConversations';
import { CareTeamCard } from '@/components/patient/dashboard/CareTeamCard';
import { DashboardAppointmentsWidget } from '@/components/patient/dashboard/DashboardAppointmentsWidget';
import { DashboardPrescriptionsWidget } from '@/components/patient/dashboard/DashboardPrescriptionsWidget';
import { DashboardMessagesWidget } from '@/components/patient/dashboard/DashboardMessagesWidget';
import { PrescriptionCard } from '@/components/cards/PrescriptionCard';
import { MessageCard } from '@/components/cards/MessageCard';
import { useAppointments, ConvexAppointment } from '@/hooks/useAppointments';
import { usePatientProfileData } from '@/hooks/usePatientProfileData';
import { CardEventHandlers } from '@/components/cards/types';

export default function PatientDashboardPage() {
  const { data: session, status } = useZentheaSession();
  const sessionUserId = session?.user?.id;
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [messageCardData, setMessageCardData] = useState<any>(null);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  
  // Fetch appointments using hook
  const { appointments: convexAppointments, isLoading: appointmentsLoading } = useAppointments('all');

  // Fetch patient profile for medications
  const { patientProfile, isLoading: profileLoading } = usePatientProfileData();

  // Fetch recent messages/conversations from Postgres
  const { conversations, isLoading: messagesLoading } = useConversations();

  // Transform appointments for widget
  const upcomingAppointments = useMemo(() => {
    if (!convexAppointments || convexAppointments.length === 0) {
      return [];
    }

    const now = Date.now();
    const upcoming = convexAppointments
      .filter((apt: ConvexAppointment) => {
        const scheduledTime = apt.scheduledAt;
        const isUpcoming = scheduledTime > now;
        const isScheduledOrConfirmed = apt.status === 'scheduled' || apt.status === 'confirmed';
        return isUpcoming && isScheduledOrConfirmed;
      })
      .sort((a: ConvexAppointment, b: ConvexAppointment) => a.scheduledAt - b.scheduledAt)
      .slice(0, 2);

    return upcoming.map((apt: ConvexAppointment) => {
      const scheduledDate = new Date(apt.scheduledAt);
      return {
        id: apt._id,
        date: scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
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

    return patientProfile.medications.map((medication: any, index: number) => ({
      id: `med-${index}`,
      name: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      prescriber: medication.prescribedBy,
      startDate: medication.startDate,
      status: 'active',
      indication: medication.indication,
      notes: medication.notes,
      route: medication.route,
    }));
  }, [patientProfile]);

  const getPrescriptionCardData = (prescription: any) => {
    const medicationIndex = prescriptions.findIndex((p: any) => p.id === prescription.id);
    const medication = patientProfile?.medications?.[medicationIndex];
    if (!medication) return null;

    return {
      id: prescription.id,
      patientId: sessionUserId || 'unknown',
      patientName: session?.user?.name || 'Patient',
      patientDateOfBirth: patientProfile?.dateOfBirth || 'Unknown',
      medication: {
        name: medication.name,
        genericName: medication.name,
        strength: medication.dosage || 'Unknown',
        form: 'Tablet',
        drugClass: 'Unknown',
        ndc: '',
        manufacturer: 'Unknown',
        controlledSubstance: false,
        schedule: null
      },
      prescription: {
        status: 'active' as const,
        dosage: medication.dosage,
        frequency: medication.frequency,
        quantity: 30,
        refills: 3,
        daysSupply: 30,
        startDate: medication.startDate,
        endDate: null,
        instructions: medication.notes || medication.frequency,
        indication: medication.indication || 'Not specified'
      },
      prescriber: {
        name: medication.prescribedBy || 'Unknown Provider',
        specialty: 'General Practice',
        npi: '',
        dea: '',
        phone: '',
        email: ''
      },
      pharmacy: {
        name: 'Unknown Pharmacy',
        address: '',
        phone: '',
        ncpdp: '',
        preferred: false
      },
      interactions: [],
      allergies: [],
      refillHistory: [],
      monitoring: { labTests: [], vitalSigns: [], symptoms: [], frequency: '', followUp: '' },
      careTeam: medication.prescribedBy ? [{
        id: '1',
        name: medication.prescribedBy,
        role: 'Prescriber',
        initials: medication.prescribedBy.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
        isActive: true
      }] : [],
      tags: [],
      documents: [],
      comments: []
    };
  };

  const handlePrescriptionClick = (prescription: any) => {
    setSelectedPrescriptionId(selectedPrescriptionId === prescription.id ? null : prescription.id);
  };

  const prescriptionCardData = useMemo(() => {
    const selected = selectedPrescriptionId ? prescriptions.find((p: any) => p.id === selectedPrescriptionId) : null;
    return selected ? getPrescriptionCardData(selected) : null;
  }, [selectedPrescriptionId, prescriptions, patientProfile]);

  const handleMessageClick = async (message: any) => {
    if (selectedMessageId === message.id) {
      setSelectedMessageId(null);
      setMessageCardData(null);
      return;
    }

    setSelectedMessageId(message.id);
    setIsLoadingMessage(true);

    try {
      const res = await fetch(`/api/messages/thread?threadId=${message.id}`);
      if (!res.ok) throw new Error('Failed to fetch thread');
      const threadMessages = await res.json();

      const conversation = conversations?.find((c: any) => c.threadId === message.id);
      const otherUser = conversation?.otherUser;

      const mappedThreadMessages = threadMessages.map((msg: any) => ({
        id: msg.id,
        sender: {
          id: msg.fromUserId,
          name: msg.fromUserName || 'Unknown',
          role: msg.fromUserId === sessionUserId ? 'patient' : 'provider',
          initials: msg.fromUserName ? msg.fromUserName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'U',
          isProvider: msg.fromUserId !== sessionUserId
        },
        content: msg.content,
        timestamp: msg.createdAt,
        isRead: msg.isRead,
        messageType: msg.fromUserId === sessionUserId ? 'outgoing' : 'incoming',
        isInternal: false,
        attachments: []
      }));

      const lastMessage = conversation?.lastMessage;
      const senderName = otherUser?.name || 'Care Team';
      
      const cardData = {
        id: message.id,
        patientId: sessionUserId || 'unknown',
        patientName: session?.user?.name || 'Patient',
        threadId: message.id,
        subject: lastMessage?.content?.substring(0, 50) || 'Message',
        messageType: 'incoming' as const,
        priority: 'normal' as const,
        sender: {
          id: otherUser?.id || 'unknown',
          name: senderName,
          role: 'provider',
          initials: senderName.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
          isProvider: true
        },
        recipient: {
          id: sessionUserId || 'unknown',
          name: session?.user?.name || 'Patient',
          role: 'patient',
          initials: session?.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'P',
          isProvider: false
        },
        content: lastMessage?.content || '',
        isRead: !conversation?.unreadCount,
        isStarred: false,
        isArchived: false,
        timestamp: lastMessage?.createdAt,
        sentAt: lastMessage?.createdAt,
        threadMessages: mappedThreadMessages,
        attachments: [],
        tags: [],
        isEncrypted: false,
        readReceipts: { delivered: true, read: !conversation?.unreadCount },
        threadStatus: 'active' as const,
        lastActivity: lastMessage?.createdAt,
        canReply: true, canForward: true, canEdit: false, canDelete: false, canArchive: true, canStar: true,
        actions: { canReply: true, canForward: true, canEdit: false, canArchive: true, canDelete: false, canStar: true, canMarkAsRead: true },
        careTeam: [], documents: [], comments: [], isHIPAACompliant: true
      };

      setMessageCardData(cardData);
    } catch (error) {
      console.error('Error loading message:', error);
      setSelectedMessageId(null);
    } finally {
      setIsLoadingMessage(false);
    }
  };

  const recentMessages = useMemo(() => {
    if (!conversations) return [];
    return [...conversations]
      .sort((a, b) => new Date(b.lastMessage?.createdAt).getTime() - new Date(a.lastMessage?.createdAt).getTime())
      .slice(0, 2)
      .map((conv) => {
        const otherUser = conv.otherUser;
        const fromName = otherUser?.name || otherUser?.email || 'Care Team';
        const createdAt = new Date(conv.lastMessage?.createdAt);
        const diffHours = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
        
        return {
          id: conv.threadId,
          from: fromName,
          subject: conv.lastMessage?.content?.substring(0, 50) || 'New message',
          date: diffHours < 1 ? 'Just now' : diffHours < 24 ? `${diffHours}h ago` : `${Math.floor(diffHours/24)}d ago`,
          unread: conv.unreadCount > 0,
        };
      });
  }, [conversations]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (!session || session.user.role !== 'patient') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Please sign in to access your patient dashboard.</p>
        </div>
      </div>
    );
  }

  const prescriptionsLoading = profileLoading;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto" data-testid="patient-dashboard">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-text-primary">
          Welcome back, {session.user.name?.split(' ')[0] || 'Patient'}
        </h1>
        <p className="text-text-secondary">Here&apos;s what&apos;s happening with your health today.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardAppointmentsWidget 
          appointments={upcomingAppointments} 
          isLoading={appointmentsLoading}
        />
        <DashboardPrescriptionsWidget 
          prescriptions={prescriptions} 
          isLoading={prescriptionsLoading}
          onPrescriptionClick={handlePrescriptionClick}
          selectedPrescriptionId={selectedPrescriptionId}
        />
        <DashboardMessagesWidget 
          messages={recentMessages} 
          isLoading={messagesLoading}
          onMessageClick={handleMessageClick}
          selectedMessageId={selectedMessageId}
        />
      </div>

      {prescriptionCardData && (
        <div className="w-full">
          <PrescriptionCard
            id={selectedPrescriptionId || 'prescription-card'}
            type="prescription"
            title={prescriptionCardData.medication.name}
            content={null}
            prescriptionData={prescriptionCardData}
            handlers={{ onClose: () => setSelectedPrescriptionId(null), onMinimize: () => {}, onMaximize: () => {}, onEdit: () => {}, onDelete: () => {} }}
            patientId={sessionUserId || 'unknown'}
            patientName={session?.user?.name || 'Patient'}
            patientDateOfBirth={prescriptionCardData.patientDateOfBirth}
            status="inProgress"
            priority="medium"
            size={{ min: 300, max: 1200, default: 600, current: 600 }}
            position={{ x: 0, y: 0 }}
            dimensions={{ width: 600, height: 400 }}
            config={{
              type: 'prescription', color: '#5FBFAF', icon: () => null,
              size: { min: 300, max: 1200, default: 600, current: 600 }, layout: 'detailed',
              interactions: { resizable: true, draggable: false, stackable: false, minimizable: true, maximizable: true, closable: true },
              priority: { color: '#5FBFAF', borderColor: '#5FBFAF', icon: null, badge: 'Medium' }
            }}
            createdAt={new Date().toISOString()}
            updatedAt={new Date().toISOString()}
            accessCount={0} isMinimized={false} isMaximized={false} zIndex={1}
          />
        </div>
      )}

      {isLoadingMessage && selectedMessageId && (
        <div className="w-full p-4 border rounded-lg bg-surface-elevated">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-text-secondary">Loading message...</span>
          </div>
        </div>
      )}
      
      {messageCardData && !isLoadingMessage && (
        <div className="w-full">
          <MessageCard
            id={selectedMessageId || 'message-card'}
            type="message"
            title={messageCardData.subject}
            content={null}
            messageData={messageCardData}
            handlers={{ onClose: () => { setSelectedMessageId(null); setMessageCardData(null); }, onMinimize: () => {}, onMaximize: () => {}, onEdit: () => {}, onDelete: () => {} }}
            patientId={sessionUserId || 'unknown'}
            patientName={session?.user?.name || 'Patient'}
            status="inProgress"
            priority="medium"
            size={{ min: 300, max: 1200, default: 600, current: 600 }}
            position={{ x: 0, y: 0 }}
            dimensions={{ width: 600, height: 400 }}
            config={{
              type: 'message', color: '#5FBFAF', icon: () => null,
              size: { min: 300, max: 1200, default: 600, current: 600 }, layout: 'detailed',
              interactions: { resizable: true, draggable: false, stackable: false, minimizable: true, maximizable: true, closable: true },
              priority: { color: '#5FBFAF', borderColor: '#5FBFAF', icon: null, badge: 'Medium' }
            }}
            createdAt={new Date(messageCardData.timestamp).toISOString()}
            updatedAt={new Date(messageCardData.lastActivity).toISOString()}
            accessCount={0} isMinimized={false} isMaximized={false} zIndex={1}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <CareTeamCard />
      </div>
    </div>
  );
}
