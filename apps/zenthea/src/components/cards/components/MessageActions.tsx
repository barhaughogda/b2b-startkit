'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Reply, Forward, Archive, Star, StarOff, Trash2, Edit, MoreHorizontal, Mail, Phone, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageActionsProps {
  onReply?: (content?: string) => void;
  onForward?: () => void;
  onArchive?: () => void;
  onStar?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onCall?: () => void;
  onVideo?: () => void;
  onEmail?: () => void;
  isStarred?: boolean;
  isArchived?: boolean;
  canReply?: boolean;
  canForward?: boolean;
  canArchive?: boolean;
  canStar?: boolean;
  canDelete?: boolean;
  canEdit?: boolean;
  canCall?: boolean;
  canVideo?: boolean;
  canEmail?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
}

const StarButton: React.FC<{ isStarred: boolean; onStar?: () => void }> = ({ isStarred, onStar }) => (
  <Button variant="ghost" size="sm" onClick={onStar} className={cn("h-8 w-8 p-0", isStarred ? "text-yellow-500 hover:text-yellow-600" : "text-gray-400 hover:text-yellow-500")}>
    {isStarred ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
  </Button>
);

const ActionButton: React.FC<{ onClick?: () => void; icon: React.ReactNode; label: string; variant?: 'outline' | 'ghost'; size?: 'sm'; className?: string; }> = ({ onClick, icon, label, variant = 'outline', size = 'sm', className }) => (
  <Button variant={variant} size={size} onClick={onClick} className={cn("h-8 px-3", className)}>
    {icon}
    {label}
  </Button>
);

const MinimalActions: React.FC<{ canStar: boolean; isStarred: boolean; onStar?: () => void }> = ({ canStar, isStarred, onStar }) => (
  <div className="flex items-center space-x-1">
    {canStar && <StarButton isStarred={isStarred} onStar={onStar} />}
    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </div>
);

const CompactActions: React.FC<{ canReply: boolean; canStar: boolean; isStarred: boolean; onReply?: () => void; onStar?: () => void; }> = ({ canReply, canStar, isStarred, onReply, onStar }) => (
  <div className="flex items-center space-x-1">
    {canReply && (
      <Button variant="ghost" size="sm" onClick={onReply} className="h-8 px-2 text-xs">
        <Reply className="h-3 w-3 mr-1" />
        Reply
      </Button>
    )}
    {canStar && <StarButton isStarred={isStarred} onStar={onStar} />}
    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </div>
);

const DefaultActions: React.FC<{
  canReply: boolean; canForward: boolean; canCall: boolean; canVideo: boolean; canEmail: boolean; canStar: boolean; canArchive: boolean; canEdit: boolean; canDelete: boolean;
  isStarred: boolean; isArchived: boolean;
  onReply?: () => void; onForward?: () => void; onCall?: () => void; onVideo?: () => void; onEmail?: () => void; onStar?: () => void; onArchive?: () => void; onEdit?: () => void; onDelete?: () => void;
}> = ({ canReply, canForward, canCall, canVideo, canEmail, canStar, canArchive, canEdit, canDelete, isStarred, isArchived, onReply, onForward, onCall, onVideo, onEmail, onStar, onArchive, onEdit, onDelete }) => (
  <div className="flex items-center space-x-2">
    {canReply && <ActionButton onClick={onReply} icon={<Reply className="h-4 w-4 mr-1" />} label="Reply" />}
    {canForward && <ActionButton onClick={onForward} icon={<Forward className="h-4 w-4 mr-1" />} label="Forward" />}
    {canCall && <ActionButton onClick={onCall} icon={<Phone className="h-4 w-4 mr-1" />} label="Call" />}
    {canVideo && <ActionButton onClick={onVideo} icon={<Video className="h-4 w-4 mr-1" />} label="Video" />}
    {canEmail && <ActionButton onClick={onEmail} icon={<Mail className="h-4 w-4 mr-1" />} label="Email" />}
    
    <div className="flex items-center space-x-1">
      {canStar && <StarButton isStarred={isStarred} onStar={onStar} />}
      
      {canArchive && (
        <Button variant="ghost" size="sm" onClick={onArchive} className={cn("h-8 w-8 p-0", isArchived ? "text-orange-500 hover:text-orange-600" : "text-gray-400 hover:text-orange-500")}>
          <Archive className="h-4 w-4" />
        </Button>
      )}
      
      {canEdit && (
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600">
          <Edit className="h-4 w-4" />
        </Button>
      )}
      
      {canDelete && (
        <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-gray-400 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

const MessageActions: React.FC<MessageActionsProps> = ({
  onReply, onForward, onArchive, onStar, onDelete, onEdit, onCall, onVideo, onEmail,
  isStarred = false, isArchived = false,
  canReply = true, canForward = true, canArchive = true, canStar = true, canDelete = true, canEdit = false, canCall = false, canVideo = false, canEmail = false,
  variant = 'default'
}) => {
  if (variant === 'minimal') return <MinimalActions canStar={canStar} isStarred={isStarred} onStar={onStar} />;
  if (variant === 'compact') return <CompactActions canReply={canReply} canStar={canStar} isStarred={isStarred} onReply={onReply} onStar={onStar} />;
  
  return (
    <DefaultActions
      canReply={canReply} canForward={canForward} canCall={canCall} canVideo={canVideo} canEmail={canEmail} canStar={canStar} canArchive={canArchive} canEdit={canEdit} canDelete={canDelete}
      isStarred={isStarred} isArchived={isArchived}
      onReply={onReply} onForward={onForward} onCall={onCall} onVideo={onVideo} onEmail={onEmail} onStar={onStar} onArchive={onArchive} onEdit={onEdit} onDelete={onDelete}
    />
  );
};

export { MessageActions };