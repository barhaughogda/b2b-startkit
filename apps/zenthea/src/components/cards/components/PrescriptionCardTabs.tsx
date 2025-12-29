'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Info, 
  Users, 
  Tag, 
  Calendar, 
  Paperclip, 
  FileText, 
  Activity 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrescriptionCardTabsProps {
  activeTab: string;
  onTabChange?: (tab: string) => void;
  tabNames: string[];
}

const tabConfig = {
  info: {
    label: 'Info',
    icon: Info
  },
  members: {
    label: 'Members',
    icon: Users
  },
  tags: {
    label: 'Tags',
    icon: Tag
  },
  dueDate: {
    label: 'Due Date',
    icon: Calendar
  },
  attachments: {
    label: 'Attachments',
    icon: Paperclip
  },
  notes: {
    label: 'Notes',
    icon: FileText
  },
  activity: {
    label: 'Activity',
    icon: Activity
  }
};

export const PrescriptionCardTabs: React.FC<PrescriptionCardTabsProps> = ({
  activeTab,
  onTabChange,
  tabNames
}) => {
  const handleTabClick = (tabName: string) => {
    if (onTabChange) {
      onTabChange(tabName);
    }
  };

  const formatTabLabel = (tabName: string): string => {
    // Convert camelCase to Title Case
    return tabName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
      {tabNames.map((tabName) => {
        const config = tabConfig[tabName as keyof typeof tabConfig];
        const isActive = activeTab === tabName;
        const Icon = config?.icon || Info;
        const label = config?.label || formatTabLabel(tabName);

        return (
          <Button
            key={tabName}
            variant="ghost"
            size="sm"
            onClick={() => handleTabClick(tabName)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        );
      })}
    </div>
  );
};
