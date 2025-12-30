'use client';

import React from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { ClinicLayout } from '@/components/layout/ClinicLayout';
import { ArrowLeft, Mic, MicOff, Send, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function AIAssistantPage() {
  const { data: session, status } = useZentheaSession();
  const router = useRouter();
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your AI assistant. How can I help you today? You can ask me about patient records, schedule appointments, or get medical information.",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
  }, [status, router]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle message submission
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Simulate AI response (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: generateAIResponse(userMessage.content),
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I encountered an error. Please try again.",
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate AI response (placeholder - replace with actual AI integration)
  const generateAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('appointment') || lowerMessage.includes('schedule')) {
      return "I can help you with appointments. You have 3 appointments scheduled today:\n• John Doe at 9:00 AM\n• Jane Smith at 10:30 AM\n• Bob Johnson at 2:00 PM\n\nWould you like me to help you manage any of these appointments?";
    }
    
    if (lowerMessage.includes('patient') || lowerMessage.includes('record')) {
      return "I can help you access patient records. Please specify which patient you'd like to review, or let me know what information you need.";
    }
    
    if (lowerMessage.includes('medical') || lowerMessage.includes('health')) {
      return "I can provide general medical information and help with clinical queries. What specific medical topic would you like to discuss?";
    }
    
    return "I understand you're asking about: " + userMessage + ". How can I best assist you with this?";
  };

  // Handle key press for message submission
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle voice recording toggle
  const handleVoiceToggle = () => {
    setIsRecording(!isRecording);
    // TODO: Implement actual voice recording functionality
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zenthea-teal mx-auto"></div>
          <p className="mt-4 text-text-primary">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-primary">Please sign in to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <ClinicLayout showSearch={true}>
      <div className="flex-1 pb-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => router.push('/company/dashboard')}
                className="flex items-center text-text-primary hover:text-zenthea-teal transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Dashboard
              </button>
            </div>
            <h1 className="text-3xl font-bold text-text-primary">AI Assistant</h1>
            <p className="text-text-secondary mt-1">Get intelligent assistance with your healthcare tasks</p>
          </div>
          {/* AI Assistant Interface */}
          <div className="bg-surface-elevated rounded-xl border border-border-primary/20 overflow-hidden">
            <div className="p-6 border-b border-border-primary/10">
              <div className="flex items-center">
                <Bot className="w-5 h-5 text-zenthea-teal mr-3" />
                <h2 className="text-lg font-semibold text-text-primary">AI Assistant</h2>
              </div>
              <p className="text-sm text-text-secondary mt-1">Ask me anything about your patients, appointments, or medical queries</p>
            </div>
            
            {/* Chat Interface */}
            <div className="p-6">
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      message.sender === 'user' ? 'justify-end' : ''
                    }`}
                  >
                    {message.sender === 'ai' && (
                      <div className="w-8 h-8 bg-zenthea-teal/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-zenthea-teal" />
                      </div>
                    )}
                    <div
                      className={`rounded-lg p-4 max-w-md ${
                        message.sender === 'user'
                          ? 'bg-zenthea-teal text-white'
                          : 'bg-surface-interactive text-text-primary'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {message.sender === 'user' && (
                      <div className="w-8 h-8 bg-zenthea-teal/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-zenthea-teal" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-zenthea-teal/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-zenthea-teal" />
                    </div>
                    <div className="bg-surface-interactive rounded-lg p-4 max-w-md">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zenthea-teal"></div>
                        <p className="text-text-primary">AI is thinking...</p>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="flex items-center space-x-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message or ask a question..."
                    disabled={isLoading}
                    className="w-full p-4 pr-12 bg-surface-interactive border border-border-primary rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-zenthea-teal/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-zenthea-teal/10 rounded-lg hover:bg-zenthea-teal/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 text-zenthea-teal" />
                  </button>
                </div>
                <button
                  onClick={handleVoiceToggle}
                  className={`p-4 rounded-lg transition-colors ${
                    isRecording
                      ? 'bg-status-error/10 hover:bg-status-error/20'
                      : 'bg-zenthea-teal/10 hover:bg-zenthea-teal/20'
                  }`}
                >
                  {isRecording ? (
                    <MicOff className="w-5 h-5 text-status-error" />
                  ) : (
                    <Mic className="w-5 h-5 text-zenthea-teal" />
                  )}
                </button>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setInputMessage("Show me patient records")}
                  className="p-4 bg-surface-interactive rounded-lg hover:bg-zenthea-teal/10 transition-colors text-left"
                >
                  <h3 className="font-medium text-text-primary">Patient Records</h3>
                  <p className="text-sm text-text-secondary mt-1">Access patient information</p>
                </button>
                <button
                  onClick={() => setInputMessage("Show me today's appointments")}
                  className="p-4 bg-surface-interactive rounded-lg hover:bg-zenthea-teal/10 transition-colors text-left"
                >
                  <h3 className="font-medium text-text-primary">Schedule Management</h3>
                  <p className="text-sm text-text-secondary mt-1">Manage appointments</p>
                </button>
                <button
                  onClick={() => setInputMessage("I need medical information about")}
                  className="p-4 bg-surface-interactive rounded-lg hover:bg-zenthea-teal/10 transition-colors text-left"
                >
                  <h3 className="font-medium text-text-primary">Medical Queries</h3>
                  <p className="text-sm text-text-secondary mt-1">Get medical information</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClinicLayout>
  );
}

