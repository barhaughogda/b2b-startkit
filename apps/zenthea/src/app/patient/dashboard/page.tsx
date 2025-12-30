'use client';

import React, { useMemo, useState } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { CareTeamCard } from '@/components/patient/dashboard/CareTeamCard';
import { DashboardAppointmentsWidget } from '@/components/patient/dashboard/DashboardAppointmentsWidget';
import { DashboardPrescriptionsWidget } from '@/components/patient/dashboard/DashboardPrescriptionsWidget';
import { DashboardMessagesWidget } from '@/components/patient/dashboard/DashboardMessagesWidget';
import { PrescriptionCard } from '@/components/cards/PrescriptionCard';
import { MessageCard } from '@/components/cards/MessageCard';
import { useAppointments, ConvexAppointment } from '@/hooks/useAppointments';
import { usePatientProfileData } from '@/hooks/usePatientProfileData';
import { canUseConvexQuery } from '@/lib/convexIdValidation';
import { CardEventHandlers } from '@/components/cards/types';
import { ConvexHttpClient } from 'convex/browser';

export default function PatientDashboardPage() {
  const { data: session, status } = useZentheaSession();
  const tenantId = session?.user?.tenantId || 'demo-tenant';
  const sessionUserId = session?.user?.id;
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [messageCardData, setMessageCardData] = useState<any>(null);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  
  // Check if userId is a valid Convex ID format
  const isValidConvexId = sessionUserId && typeof sessionUserId === 'string' && /^[jk][a-z0-9]{15,}$/.test(sessionUserId);
  const userId = isValidConvexId ? (sessionUserId as Id<'users'>) : undefined;

  // Fetch appointments using hook
  const { appointments: convexAppointments, isLoading: appointmentsLoading } = useAppointments('all');

  // Fetch patient profile for medications
  const { patientProfile, isLoading: profileLoading } = usePatientProfileData();

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
      indication: medication.indication,
      notes: medication.notes,
      route: medication.route,
    }));
  }, [patientProfile]);

  // Transform medication to PrescriptionCard data format
  const getPrescriptionCardData = (prescription: typeof prescriptions[0]) => {
    const medicationIndex = prescriptions.findIndex((p: typeof prescriptions[0]) => p.id === prescription.id);
    const medication = patientProfile?.medications?.[medicationIndex];
    
    if (!medication) return null;

    // Extract strength from dosage (e.g., "500mg" -> "500mg")
    const strength = medication.dosage || 'Unknown';
    
    // Extract form from route or default to "Tablet"
    const form = medication.route === 'oral' ? 'Tablet' : 
                 medication.route === 'topical' ? 'Cream' :
                 medication.route === 'injection' ? 'Injection' :
                 medication.route === 'inhalation' ? 'Inhaler' : 'Tablet';

    return {
      id: prescription.id,
      patientId: userId || 'unknown',
      patientName: session?.user?.name || 'Patient',
      patientDateOfBirth: patientProfile?.dateOfBirth || 'Unknown',
      medication: {
        name: medication.name,
        genericName: medication.name, // Use same name if generic not available
        strength: strength,
        form: form,
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
        quantity: 30, // Default
        refills: 3, // Default
        daysSupply: 30, // Default
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
      monitoring: {
        labTests: [],
        vitalSigns: [],
        symptoms: [],
        frequency: '',
        followUp: ''
      },
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

  const handlePrescriptionClick = (prescription: typeof prescriptions[0]) => {
    if (selectedPrescriptionId === prescription.id) {
      // If clicking the same prescription, close it
      setSelectedPrescriptionId(null);
    } else {
      // Open the clicked prescription
      setSelectedPrescriptionId(prescription.id);
    }
  };

  const selectedPrescription = selectedPrescriptionId 
    ? prescriptions.find((p: typeof prescriptions[0]) => p.id === selectedPrescriptionId)
    : null;

  const prescriptionCardData = selectedPrescription 
    ? getPrescriptionCardData(selectedPrescription)
    : null;

  const prescriptionCardHandlers: CardEventHandlers = {
    onClose: () => setSelectedPrescriptionId(null),
    onMinimize: () => {},
    onMaximize: () => {},
    onEdit: () => {},
    onDelete: () => {},
  };

  const messageCardHandlers: CardEventHandlers = {
    onClose: () => {
      setSelectedMessageId(null);
      setMessageCardData(null);
    },
    onMinimize: () => {},
    onMaximize: () => {},
    onEdit: () => {},
    onDelete: () => {},
  };

  // Fetch and transform message data for MessageCard
  const handleMessageClick = async (message: typeof recentMessages[0]) => {
    if (selectedMessageId === message.id) {
      // If clicking the same message, close it
      setSelectedMessageId(null);
      setMessageCardData(null);
      return;
    }

    // Set selected message ID immediately for UI feedback
    setSelectedMessageId(message.id);
    setIsLoadingMessage(true);

    try {
      // Find the conversation
      const conversation = conversations?.find((c: NonNullable<typeof conversations>[0]) => c.threadId === message.id);
      if (!conversation || !userId || !tenantId) {
        setIsLoadingMessage(false);
        return;
      }

      // Fetch full conversation thread
      if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
        console.error('NEXT_PUBLIC_CONVEX_URL is not configured');
        setIsLoadingMessage(false);
        setSelectedMessageId(null);
        return;
      }

      const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
      const threadMessages = await convexClient.query(api.messages.getConversation, {
        tenantId,
        threadId: message.id,
        userId
      });

      const otherUser = conversation.otherUser;
      const lastMessage = conversation.lastMessage;

      // Map thread messages
      const mappedThreadMessages = threadMessages.map((msg: any) => ({
        id: msg._id,
        sender: {
          id: msg.fromUser?.id || msg.fromUserId || 'unknown',
          name: msg.fromUser ? `${msg.fromUser.firstName || ''} ${msg.fromUser.lastName || ''}`.trim() || msg.fromUser.email || 'Unknown' : 'Unknown',
          role: msg.fromUser?.role || 'patient',
          initials: msg.fromUser ? `${msg.fromUser.firstName?.[0] || ''}${msg.fromUser.lastName?.[0] || ''}`.toUpperCase() : 'U',
          isProvider: msg.fromUser?.role === 'provider'
        },
        content: msg.content || '',
        timestamp: new Date(msg.createdAt).toISOString(),
        isRead: msg.isRead || false,
        messageType: msg.fromUserId === userId ? 'outgoing' : 'incoming',
        isInternal: false,
        attachments: msg.attachments || []
      }));

      // Collect all attachments
      const allAttachments: Array<{
        id: string;
        name: string;
        type: string;
        size: number;
        url: string;
        thumbnail?: string;
      }> = [];
      
      mappedThreadMessages.forEach((msg: any) => {
        if (msg.attachments && Array.isArray(msg.attachments)) {
          msg.attachments.forEach((att: any) => {
            allAttachments.push({
              id: att.id || att._id || `att-${Math.random()}`,
              name: att.name || 'Attachment',
              type: att.type || 'application/octet-stream',
              size: att.size || 0,
              url: att.url || '',
              thumbnail: att.thumbnail
            });
          });
        }
      });

      // Determine sender and recipient
      const senderName = otherUser 
        ? `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() || otherUser.email || 'Care Team'
        : 'Care Team';
      
      const senderInitials = otherUser 
        ? `${otherUser.firstName?.[0] || ''}${otherUser.lastName?.[0] || ''}`.toUpperCase()
        : 'CT';

      // Create MessageCard data
      const cardData = {
        id: message.id,
        patientId: userId || 'unknown',
        patientName: session?.user?.name || 'Patient',
        threadId: message.id,
        subject: lastMessage?.content?.substring(0, 50) || 'Message',
        messageType: 'incoming' as const,
        priority: 'normal' as const,
        sender: {
          id: otherUser?.id || 'unknown',
          name: senderName,
          role: otherUser?.role || 'provider',
          initials: senderInitials,
          isProvider: otherUser?.role === 'provider'
        },
        recipient: {
          id: userId || 'unknown',
          name: session?.user?.name || 'Patient',
          role: 'patient',
          initials: session?.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'P',
          isProvider: false
        },
        content: lastMessage?.content || '',
        isRead: !conversation.unreadCount || conversation.unreadCount === 0,
        isStarred: false,
        isArchived: false,
        timestamp: lastMessage?.createdAt ? new Date(lastMessage.createdAt).toISOString() : new Date().toISOString(),
        sentAt: lastMessage?.createdAt ? new Date(lastMessage.createdAt).toISOString() : new Date().toISOString(),
        threadMessages: mappedThreadMessages,
        attachments: allAttachments,
        tags: [],
        isEncrypted: false,
        readReceipts: {
          delivered: true,
          read: !conversation.unreadCount || conversation.unreadCount === 0
        },
        threadStatus: 'active' as const,
        lastActivity: lastMessage?.createdAt ? new Date(lastMessage.createdAt).toISOString() : new Date().toISOString(),
        canReply: true,
        canForward: true,
        canEdit: false,
        canDelete: false,
        canArchive: true,
        canStar: true,
        actions: {
          canReply: true,
          canForward: true,
          canEdit: false,
          canDelete: false,
          canArchive: true,
          canStar: true,
          canMarkAsRead: true
        },
        careTeam: [],
        documents: [],
        comments: [],
        isHIPAACompliant: true
      };

      setMessageCardData(cardData);
    } catch (error) {
      console.error('Error loading message:', error);
      setSelectedMessageId(null);
    } finally {
      setIsLoadingMessage(false);
    }
  };

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

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
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

  const messagesLoading = !!(userId && tenantId && conversations === undefined);
  const prescriptionsLoading = profileLoading;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto" data-testid="patient-dashboard">
      {/* Welcome Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-text-primary">
          Welcome back, {session.user.name?.split(' ')[0] || 'Patient'}
        </h1>
        <p className="text-text-secondary">
          Here&apos;s what&apos;s happening with your health today.
        </p>
      </div>

      {/* First Row: Appointments, Prescriptions, Messages */}
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

      {/* Prescription Card - Opens inline when a prescription is clicked */}
      {prescriptionCardData && (
        <div className="w-full">
          <PrescriptionCard
            id={selectedPrescriptionId || 'prescription-card'}
            type="prescription"
            title={prescriptionCardData.medication.name}
            content={null}
            prescriptionData={prescriptionCardData}
            handlers={prescriptionCardHandlers}
            patientId={userId || 'unknown'}
            patientName={session?.user?.name || 'Patient'}
            patientDateOfBirth={prescriptionCardData.patientDateOfBirth}
            status="inProgress"
            priority="medium"
            size={{ min: 300, max: 1200, default: 600, current: 600 }}
            position={{ x: 0, y: 0 }}
            dimensions={{ width: 600, height: 400 }}
            config={{
              type: 'prescription',
              color: '#5FBFAF',
              icon: () => null,
              size: { min: 300, max: 1200, default: 600, current: 600 },
              layout: 'detailed',
              interactions: {
                resizable: true,
                draggable: false,
                stackable: false,
                minimizable: true,
                maximizable: true,
                closable: true,
              },
              priority: {
                color: '#5FBFAF',
                borderColor: '#5FBFAF',
                icon: null,
                badge: 'Medium',
              },
            }}
            createdAt={new Date().toISOString()}
            updatedAt={new Date().toISOString()}
            accessCount={0}
            isMinimized={false}
            isMaximized={false}
            zIndex={1}
          />
        </div>
      )}

      {/* Message Card - Opens inline when a message is clicked */}
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
            handlers={messageCardHandlers}
            patientId={userId || 'unknown'}
            patientName={session?.user?.name || 'Patient'}
            status="inProgress"
            priority="medium"
            size={{ min: 300, max: 1200, default: 600, current: 600 }}
            position={{ x: 0, y: 0 }}
            dimensions={{ width: 600, height: 400 }}
            config={{
              type: 'message',
              color: '#5FBFAF',
              icon: () => null,
              size: { min: 300, max: 1200, default: 600, current: 600 },
              layout: 'detailed',
              interactions: {
                resizable: true,
                draggable: false,
                stackable: false,
                minimizable: true,
                maximizable: true,
                closable: true,
              },
              priority: {
                color: '#5FBFAF',
                borderColor: '#5FBFAF',
                icon: null,
                badge: 'Medium',
              },
            }}
            createdAt={messageCardData.timestamp}
            updatedAt={messageCardData.lastActivity}
            accessCount={0}
            isMinimized={false}
            isMaximized={false}
            zIndex={1}
          />
        </div>
      )}

      {/* Second Row: Care Team (Full Width) */}
      <div className="grid grid-cols-1 gap-6">
        <CareTeamCard />
      </div>
    </div>
  );
}
