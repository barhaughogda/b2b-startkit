import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CardEventHandlers } from '../types';
import { Edit, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DiagnosisNotesTabProps {
  cardId: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  handlers: CardEventHandlers;
}

export const DiagnosisNotesTab: React.FC<DiagnosisNotesTabProps> = ({
  cardId,
  notes,
  onNotesChange,
  handlers
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [localNotes, setLocalNotes] = React.useState(notes);

  const handleSave = () => {
    onNotesChange(localNotes);
    setIsEditing(false);
    if (handlers.onCommentAdd) {
      handlers.onCommentAdd(cardId, {
        id: Date.now().toString(),
        author: 'Current User',
        authorRole: 'Provider',
        content: localNotes,
        timestamp: new Date().toISOString(),
        isInternal: false,
      });
    }
  };

  const handleCancel = () => {
    setLocalNotes(notes);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text-primary">Clinical Notes</h3>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center space-x-1"
          >
            <Edit className="h-4 w-4" />
            <span>{isEditing ? 'Cancel' : 'Edit'}</span>
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex items-center space-x-1"
                  aria-label="Clinical notes information"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Clinical notes are for documenting diagnosis-related observations, treatment responses, and follow-up instructions.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            data-testid="notes-textarea"
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            placeholder="Enter clinical notes about this diagnosis..."
            className="min-h-[120px]"
          />
          <div className="flex justify-end space-x-2">
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-background-secondary rounded-lg">
          <p className="text-sm text-text-primary whitespace-pre-wrap">
            {notes || 'No notes available. Click Edit to add notes.'}
          </p>
        </div>
      )}
    </div>
  );
};

