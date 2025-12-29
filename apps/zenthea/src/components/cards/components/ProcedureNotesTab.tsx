import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Save, Edit, Eye, EyeOff } from 'lucide-react';
import { ProcedureCardProps, CardEventHandlers } from '../types';

interface ProcedureNotesTabProps {
  procedureData: ProcedureCardProps['procedureData'];
  handlers: CardEventHandlers;
  initialNotes?: string;
}

export const ProcedureNotesTab: React.FC<ProcedureNotesTabProps> = ({ 
  procedureData, 
  handlers,
  initialNotes = 'Patient prepared well for procedure. No complications.'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(initialNotes);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = () => {
    setIsEditing(false);
    if (handlers.onCommentAdd) {
      handlers.onCommentAdd(procedureData.id, {
        id: Date.now().toString(),
        author: 'Current User',
        authorRole: 'Provider',
        content: notes,
        timestamp: new Date().toISOString(),
        isInternal: false,
      });
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const toggleNotesVisibility = () => {
    setShowNotes(!showNotes);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Clinical Notes</h3>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={toggleNotesVisibility}
            className="flex items-center space-x-1"
          >
            {showNotes ? (
              <>
                <EyeOff className="h-3 w-3" />
                <span>Hide</span>
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" />
                <span>Show</span>
              </>
            )}
          </Button>
        </div>
      </div>
      
      {showNotes && (
        <div className="space-y-3">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={notes}
                onChange={handleNotesChange}
                placeholder="Add clinical notes about this procedure..."
                className="min-h-[120px]"
              />
              <div className="flex justify-end space-x-2">
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-3 bg-gray-50 rounded-lg min-h-[120px]">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {notes || "No clinical notes added yet. Click Edit to add notes about this procedure."}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Click Edit to add or modify clinical notes
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEdit}
                  className="flex items-center space-x-1"
                >
                  <Edit className="h-3 w-3" />
                  <span>Edit</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

