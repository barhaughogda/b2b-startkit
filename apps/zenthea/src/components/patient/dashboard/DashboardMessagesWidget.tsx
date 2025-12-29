import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface Message {
  id: number | string;
  from: string;
  subject: string;
  date: string;
  unread: boolean;
}

interface DashboardMessagesWidgetProps {
  messages: Message[];
  isLoading?: boolean;
  onMessageClick?: (message: Message) => void;
  selectedMessageId?: string | null;
}

export function DashboardMessagesWidget({ 
  messages, 
  isLoading = false,
  onMessageClick,
  selectedMessageId 
}: DashboardMessagesWidgetProps) {
  const router = useRouter();
  const recent = messages.slice(0, 2); // Show max 2

  const handleClick = (message: Message) => {
    if (onMessageClick) {
      onMessageClick(message);
    } else {
      router.push('/patient/messages');
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-interactive-primary" />
          Recent Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-interactive-primary" />
          </div>
        ) : recent.length > 0 ? (
          recent.map((msg) => {
            const isSelected = selectedMessageId === msg.id;
            return (
            <div 
              key={msg.id} 
              onClick={() => handleClick(msg)}
              className={cn(
                "flex items-start justify-between p-3 rounded-lg border transition-colors cursor-pointer",
                isSelected
                  ? "bg-interactive-primary/10 border-interactive-primary hover:bg-interactive-primary/15"
                  : msg.unread 
                    ? "bg-interactive-primary/5 border-interactive-primary/20 hover:bg-interactive-primary/10" 
                    : "border-border-primary/50 bg-surface-elevated/30 hover:bg-surface-elevated"
              )}
            >
              <div className="space-y-1 w-full">
                <div className="flex justify-between items-start">
                  <p className={cn("font-medium text-sm", msg.unread ? "text-interactive-primary" : "text-text-primary")}>
                    {msg.from}
                  </p>
                  <span className="text-xs text-text-tertiary whitespace-nowrap flex items-center gap-1">
                    {msg.date}
                  </span>
                </div>
                <p className="text-sm text-text-secondary line-clamp-1">{msg.subject}</p>
              </div>
            </div>
            );
          })
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-text-tertiary mb-2">No new messages</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/patient/messages')}
              className="mt-2"
            >
              Send a message
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

