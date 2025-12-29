'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Reply, ChevronDown, ChevronUp } from 'lucide-react';

interface ThreadMessage {
  id: string;
  sender: { id: string; name: string; role: string; avatar?: string; initials: string; isProvider: boolean; };
  content: string;
  timestamp: string;
  isRead: boolean;
}

interface MessageThreadProps {
  thread: ThreadMessage[];
  onReply?: (content: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  canReply?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
  return date.toLocaleDateString();
};

const ThreadMessageComponent: React.FC<{
  message: ThreadMessage;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  editingMessage: string | null;
  editContent: string;
  setEditingMessage: (id: string | null) => void;
  setEditContent: (content: string) => void;
}> = ({ message, onEdit, onDelete, canEdit, canDelete, editingMessage, editContent, setEditingMessage, setEditContent }) => {
  const isEditing = editingMessage === message.id;

  return (
    <div className="flex space-x-3 p-3 bg-gray-50 rounded-lg">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={message.sender.avatar} alt={message.sender.name} />
        <AvatarFallback className="bg-blue-100 text-blue-800 text-xs">{message.sender.initials}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900">{message.sender.name}</span>
          <span className="text-xs text-gray-500">{formatTimestamp(message.timestamp)}</span>
          {message.sender.isProvider && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Provider</span>
          )}
        </div>
        
        {isEditing ? (
          <div className="mt-2 space-y-2">
            <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[60px]" placeholder="Edit your message..." />
            <div className="flex space-x-2">
              <Button size="sm" onClick={() => { if (editContent.trim() && onEdit) { onEdit(message.id, editContent.trim()); setEditingMessage(null); setEditContent(''); } }}>Save</Button>
              <Button variant="outline" size="sm" onClick={() => { setEditingMessage(null); setEditContent(''); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{message.content}</p>
        )}
        
        <div className="flex items-center space-x-2 mt-2">
          {canEdit && !isEditing && (
            <Button variant="ghost" size="sm" onClick={() => { setEditingMessage(message.id); setEditContent(message.content); }} className="h-6 px-2 text-xs">Edit</Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="sm" onClick={() => onDelete?.(message.id)} className="h-6 px-2 text-xs text-red-600 hover:text-red-800">Delete</Button>
          )}
        </div>
      </div>
    </div>
  );
};

const MessageThread: React.FC<MessageThreadProps> = ({
  thread, onReply, onEdit, onDelete, canReply = true, canEdit = false, canDelete = false, isExpanded = false, onToggleExpanded
}) => {
  const [replyContent, setReplyContent] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleReply = () => {
    if (replyContent.trim() && onReply) {
      onReply(replyContent.trim());
      setReplyContent('');
      setShowReplyForm(false);
    }
  };

  const displayMessages = isExpanded ? thread : thread.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">Conversation Thread</h4>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">Messages: {thread.length}</span>
          {thread.length > 3 && (
            <Button variant="ghost" size="sm" onClick={onToggleExpanded} className="h-6 w-6 p-0">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {displayMessages.map((message) => (
          <ThreadMessageComponent
            key={message.id}
            message={message}
            onEdit={onEdit}
            onDelete={onDelete}
            canEdit={canEdit}
            canDelete={canDelete}
            editingMessage={editingMessage}
            editContent={editContent}
            setEditingMessage={setEditingMessage}
            setEditContent={setEditContent}
          />
        ))}
      </div>

      {showReplyForm && (
        <div className="space-y-2">
          <Textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="Type your reply..." className="min-h-[80px]" />
          <div className="flex space-x-2">
            <Button size="sm" onClick={handleReply} disabled={!replyContent.trim()}>
              <Send className="h-4 w-4 mr-1" />
              Send Reply
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setShowReplyForm(false); setReplyContent(''); }}>Cancel</Button>
          </div>
        </div>
      )}

      {canReply && !showReplyForm && (
        <Button variant="outline" size="sm" onClick={() => setShowReplyForm(true)} className="w-full">
          <Reply className="h-4 w-4 mr-2" />
          Reply to Thread
        </Button>
      )}
    </div>
  );
};

export { MessageThread };