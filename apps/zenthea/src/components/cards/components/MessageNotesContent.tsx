'use client';

import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CardComment } from '../types';

interface MessageNotesContentProps {
  comments: CardComment[];
}

export const MessageNotesContent: React.FC<MessageNotesContentProps> = ({ comments = [] }) => {
  return (
    <div className="p-4">
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-3">Clinical Notes</h4>
          <div className="space-y-3">
            {(comments || []).map((comment) => (
              <div key={comment.id} className="p-3 rounded-lg border border-border-primary">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {comment.author.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{comment.author}</div>
                    <div className="text-xs text-text-tertiary">
                      {new Date(comment.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-text-primary">{comment.content}</p>
              </div>
            ))}
            {comments.length === 0 && (
              <div className="text-sm text-text-tertiary text-center py-4">
                No clinical notes
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
