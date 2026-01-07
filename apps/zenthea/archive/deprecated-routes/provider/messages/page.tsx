"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Send, Search, Filter } from "lucide-react";

// Mock data for messages
const messages = [
  {
    id: "1",
    patientName: "John Doe",
    lastMessage: "Thank you for the prescription. When should I take it?",
    timestamp: "2 min ago",
    unread: true,
    avatar: "/avatars/john.jpg"
  },
  {
    id: "2",
    patientName: "Jane Smith", 
    lastMessage: "I have a question about my test results",
    timestamp: "1 hour ago",
    unread: true,
    avatar: "/avatars/jane.jpg"
  },
  {
    id: "3",
    patientName: "Bob Johnson",
    lastMessage: "See you at the appointment tomorrow",
    timestamp: "3 hours ago",
    unread: false,
    avatar: "/avatars/bob.jpg"
  }
];

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <div>
       <div>
         <h1 className="text-3xl font-bold text-text-primary">Messages</h1>
         <p className="text-text-secondary mt-1">Communicate with your patients securely</p>
       </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Conversations</CardTitle>
                <Button size="sm" variant="outline">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 hover:bg-interactive-hover cursor-pointer border-b ${
                      message.unread ? 'bg-surface-accent' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={message.avatar} />
                        <AvatarFallback>
                          {message.patientName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-sm truncate">
                            {message.patientName}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {message.timestamp}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {message.lastMessage}
                        </p>
                        {message.unread && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Content */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="/avatars/john.jpg" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">John Doe</CardTitle>
                  <CardDescription>Patient</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <div className="h-full flex flex-col">
                {/* Messages */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  <div className="flex justify-end">
                    <div className="bg-interactive-primary text-text-on-primary rounded-lg p-3 max-w-xs">
                      <p className="text-sm">Hello Dr. Smith, I have a question about my prescription.</p>
                      <span className="text-xs opacity-75">2:30 PM</span>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="bg-surface-secondary text-text-primary rounded-lg p-3 max-w-xs">
                      <p className="text-sm">Hello John, I&apos;m here to help. What&apos;s your question?</p>
                      <span className="text-xs opacity-75">2:32 PM</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-interactive-primary text-text-on-primary rounded-lg p-3 max-w-xs">
                      <p className="text-sm">Thank you for the prescription. When should I take it?</p>
                      <span className="text-xs opacity-75">2:35 PM</span>
                    </div>
                  </div>
                </div>
                
                {/* Message Input */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      className="flex-1"
                    />
                    <Button size="sm">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
