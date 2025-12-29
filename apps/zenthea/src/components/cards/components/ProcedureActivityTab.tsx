import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Activity as ActivityIcon } from 'lucide-react';
import { ProcedureCardProps, CardEventHandlers } from '../types';

interface ProcedureActivityTabProps {
  procedureData: ProcedureCardProps['procedureData'];
  handlers: CardEventHandlers;
}

export const ProcedureActivityTab: React.FC<ProcedureActivityTabProps> = ({
  procedureData,
  handlers
}) => {
  const { comments } = procedureData;

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Activity</h3>
        <Button size="sm" variant="outline" className="flex items-center space-x-1">
          <ActivityIcon className="h-3 w-3" />
          <span>Export</span>
        </Button>
      </div>
      
      <div className="space-y-3 max-h-60 overflow-y-auto">
        {comments.map((comment) => (
          <div key={comment.id} className="flex space-x-3 p-3 bg-gray-50 rounded-lg">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {comment.author.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{comment.author}</span>
                <Badge variant="outline" className="text-xs">
                  {comment.authorRole}
                </Badge>
                <span className="text-xs text-gray-500">{comment.timestamp}</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

