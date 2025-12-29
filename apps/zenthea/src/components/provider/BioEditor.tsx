'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Edit3, X, FileText } from 'lucide-react';

interface BioEditorProps {
  bio: string;
  onSave: (bio: string) => void;
  isEditing: boolean;
}

export function BioEditor({ bio, onSave, isEditing }: BioEditorProps) {
  const [localBio, setLocalBio] = useState(bio);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalBio(bio);
  }, [bio]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(localBio);
      setIsEditingBio(false);
    } catch (error) {
      console.error('Error saving bio:', error);
      setError('Failed to save bio. Please try again.');
      // Clear error message after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save when bio changes
  useEffect(() => {
    if (isEditing && localBio !== bio) {
      const timeoutId = setTimeout(() => {
        onSave(localBio);
      }, 1000); // Auto-save after 1 second of no typing

      return () => clearTimeout(timeoutId);
    }
  }, [localBio, bio, isEditing, onSave]);

  const handleCancel = () => {
    setLocalBio(bio);
    setIsEditingBio(false);
  };

  const handleEdit = () => {
    setIsEditingBio(true);
  };

  const getInitials = (text: string) => {
    return text
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Professional Bio
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {!isEditing ? (
          <div className="space-y-4">
            {localBio ? (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-text-primary leading-relaxed">
                  {localBio}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No bio written yet.</p>
                <p className="text-sm">Add a professional introduction to help patients get to know you.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bio">
                Write a professional bio to introduce yourself to patients
              </Label>
              <Textarea
                id="bio"
                value={localBio}
                onChange={(e) => setLocalBio(e.target.value)}
                placeholder="Tell patients about your background, experience, and approach to care. This will help them feel more comfortable and confident in your care."
                className="min-h-[200px] resize-none"
                maxLength={1000}
              />
              <div className="flex justify-between text-sm text-text-secondary">
                <span>This bio will be visible to your patients</span>
                <span>{localBio.length}/1000 characters</span>
              </div>
            </div>

          </div>
        )}

        {/* Bio Writing Tips */}
        {isEditing && (
          <div className="mt-6 p-4 bg-surface-interactive rounded-lg">
            <h4 className="text-sm font-medium text-text-primary mb-2">Writing Tips:</h4>
            <ul className="text-sm text-text-secondary space-y-1">
              <li>• Include your medical background and years of experience</li>
              <li>• Mention your specialties and areas of expertise</li>
              <li>• Share your approach to patient care</li>
              <li>• Keep it professional but warm and approachable</li>
              <li>• Mention any languages you speak</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
