'use client';

import { useConversations } from '@/hooks/useConversations';
import { useAppointments, ConvexAppointment } from '@/hooks/useAppointments';
import { usePatientProfileData } from '@/hooks/usePatientProfileData';
import { useCardSystem } from '@/components/cards/CardSystemProvider';
import { CardType, Priority, TaskStatus } from '@/components/cards/types';
import { transformMessageToCardData } from '@/lib/utils/messageDataTransform';

export function PatientDashboardContent() {
  const { data: session } = useZentheaSession();
  const sessionUserId = session?.user?.id;
  const { openCard } = useCardSystem();
  
  // Fetch appointments using hook
  const { appointments: convexAppointments, isLoading: appointmentsLoading } = useAppointments('all');

  // Fetch patient profile for medications
  const { patientId, patientProfile, isLoading: profileLoading } = usePatientProfileData();

  // Fetch recent messages/conversations from Postgres
  const { conversations, isLoading: messagesLoading } = useConversations();

  // ... transform appointments ...
  // ... transform prescriptions ...

  // Transform messages for widget
  const recentMessages = useMemo(() => {
    if (!conversations || conversations.length === 0) {
      return [];
    }

    // Sort by last message time and take most recent 2
    const sorted = [...conversations]
      .sort((a, b) => {
        const timeA = new Date(a.lastMessage?.createdAt || 0).getTime();
        const timeB = new Date(b.lastMessage?.createdAt || 0).getTime();
        return timeB - timeA;
      })
      .slice(0, 2);

    return sorted.map((conv) => {
      const lastMessage = conv.lastMessage;
      const otherUser = conv.otherUser;
      const fromName = otherUser 
        ? otherUser.name || `${otherUser.firstName || ''} ${otherUser.lastName || ''}`.trim() || otherUser.email || 'Care Team'
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

  // ... handle clicks ...

  const handleMessageClick = (message: { id: string | number; from: string; subject: string; date: string; unread: boolean }) => {
    const conversation = conversations?.find((conv: any) => conv.threadId === message.id);
    
    if (!conversation || !conversation.lastMessage) {
      console.error('Conversation not found:', message.id);
      return;
    }

    const lastMessage = conversation.lastMessage;
    
    const simpleMessage = {
      id: conversation.threadId,
      from: message.from,
      to: session?.user?.name || 'Patient',
      subject: message.subject,
      content: lastMessage.content || '',
      timestamp: lastMessage.createdAt,
      isRead: !message.unread,
      priority: 'medium' as 'low' | 'medium' | 'high',
      type: 'incoming' as 'incoming' | 'outgoing',
    };

    const messageData = transformMessageToCardData(simpleMessage, patientId || undefined, session?.user?.name || undefined);

    const cardPriority: Priority = 'medium';
    const cardStatus: TaskStatus = message.unread ? 'new' : 'completed';

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

  const prescriptionsLoading = profileLoading;

  return (
    <div className="space-y-8" data-testid="patient-dashboard">
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

      <div className="grid grid-cols-1 gap-6">
        <CareTeamCard />
      </div>
    </div>
  );
}

