'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  User,
  Tag,
  CalendarIcon,
  Paperclip,
  FileText,
  MessageSquare
} from 'lucide-react';

interface CardTabsProps {
  activeTab: string;
  onTabChange?: (tab: string) => void;
  tabNames?: Record<string, string>;
}

export function CardTabs({
  activeTab,
  onTabChange,
  tabNames
}: CardTabsProps) {
  return (
    <div className="flex gap-1 pt-2 pb-2 border-b border-border-primary overflow-x-auto scrollbar-hide">
      <Button
        variant={activeTab === 'info' ? 'default' : 'ghost'}
        size="sm"
        className="rounded-full text-xs whitespace-nowrap min-w-fit"
        onClick={() => onTabChange?.('info')}
      >
        <Calendar className="h-3 w-3 mr-1" />
        {tabNames?.info || 'Info'}
      </Button>
      <Button
        variant={activeTab === 'members' ? 'default' : 'ghost'}
        size="sm"
        className="rounded-full text-xs whitespace-nowrap min-w-fit"
        onClick={() => onTabChange?.('members')}
      >
        <User className="h-3 w-3 mr-1" />
        Members
      </Button>
      <Button
        variant={activeTab === 'tags' ? 'default' : 'ghost'}
        size="sm"
        className="rounded-full text-xs whitespace-nowrap min-w-fit"
        onClick={() => onTabChange?.('tags')}
      >
        <Tag className="h-3 w-3 mr-1" />
        {tabNames?.tags || 'Tags'}
      </Button>
      <Button
        variant={activeTab === 'dueDate' ? 'default' : 'ghost'}
        size="sm"
        className="rounded-full text-xs whitespace-nowrap min-w-fit"
        onClick={() => onTabChange?.('dueDate')}
      >
        <CalendarIcon className="h-3 w-3 mr-1" />
        Due Date
      </Button>
      <Button
        variant={activeTab === 'attachments' ? 'default' : 'ghost'}
        size="sm"
        className="rounded-full text-xs whitespace-nowrap min-w-fit"
        onClick={() => onTabChange?.('attachments')}
      >
        <Paperclip className="h-3 w-3 mr-1" />
        Attachments
      </Button>
      <Button
        variant={activeTab === 'notes' ? 'default' : 'ghost'}
        size="sm"
        className="rounded-full text-xs whitespace-nowrap min-w-fit"
        onClick={() => onTabChange?.('notes')}
      >
        <FileText className="h-3 w-3 mr-1" />
        Notes
      </Button>
      <Button
        variant={activeTab === 'activity' ? 'default' : 'ghost'}
        size="sm"
        className="rounded-full text-xs whitespace-nowrap min-w-fit"
        onClick={() => onTabChange?.('activity')}
      >
        <MessageSquare className="h-3 w-3 mr-1" />
        Activity
      </Button>
    </div>
  );
}
