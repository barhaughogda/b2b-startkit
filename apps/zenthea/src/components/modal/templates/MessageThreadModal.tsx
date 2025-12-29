import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Paperclip, Circle } from 'lucide-react';

interface MessageThreadModalProps {
  patientName: string;
  providerName: string;
  onClose?: () => void;
}

export const MessageThreadModal: React.FC<MessageThreadModalProps> = ({
  patientName,
  providerName,
  onClose
}) => {
  const messages = [
    {
      id: 1,
      sender: 'Dr. Smith',
      senderType: 'provider',
      content: 'Hello John, I wanted to follow up on your recent lab results. They look good overall.',
      timestamp: '2024-01-15 10:30 AM',
      isRead: true
    },
    {
      id: 2,
      sender: 'John Doe',
      senderType: 'patient',
      content: 'Thank you Dr. Smith. I was a bit concerned about the cholesterol levels.',
      timestamp: '2024-01-15 10:45 AM',
      isRead: true
    },
    {
      id: 3,
      sender: 'Dr. Smith',
      senderType: 'provider',
      content: 'Your cholesterol is slightly elevated but within manageable range. I recommend starting a low-fat diet and we can discuss medication if needed.',
      timestamp: '2024-01-15 11:00 AM',
      isRead: false
    }
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Message Thread</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{patientName}</Badge>
            <Badge variant="outline">{providerName}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Thread Information</h3>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Subject:</span> Lab Results Follow-up
              </div>
              <div>
                <span className="font-medium">Priority:</span> Normal
              </div>
              <div>
                <span className="font-medium">Status:</span> Open
              </div>
              <div>
                <span className="font-medium">Last Activity:</span> 2 hours ago
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Conversation</h3>
          <ScrollArea className="h-64 border rounded-lg p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.senderType === 'provider' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.senderType === 'patient' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{message.sender.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.senderType === 'provider'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="font-medium text-sm mb-1">{message.sender}</div>
                    <div className="text-sm">{message.content}</div>
                    <div className="text-xs opacity-70 mt-1">{message.timestamp}</div>
                  </div>
                  {message.senderType === 'provider' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{message.sender.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Reply</h3>
          <div className="space-y-2">
            <Textarea
              placeholder="Type your message here..."
              className="min-h-[100px]"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Circle className="h-4 w-4" />
                </Button>
              </div>
              <Button className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button>Mark as Complete</Button>
        </div>
      </CardContent>
    </Card>
  );
};