'use client';

import React, { useState, useEffect } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation } from 'convex/react';
// Use relative import for Convex generated files (they're at root level, not in src/)
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Save, Loader2, Plus, Trash2, Phone, User } from 'lucide-react';
import { toast } from 'sonner';

interface EmergencyContactsFormProps {
  patientId: Id<'patients'>;
  initialData?: {
    emergencyContacts?: Array<{
      name: string;
      relationship: string;
      phone: string;
      email?: string;
      isPrimary: boolean;
    }>;
    healthcareProxy?: {
      name: string;
      relationship: string;
      phone: string;
      email?: string;
      documentOnFile: boolean;
    };
  };
}

export function EmergencyContactsForm({ patientId, initialData }: EmergencyContactsFormProps) {
  const { data: session } = useZentheaSession();
  const updateProfile = useMutation((api as any).patientProfile?.updatePatientProfile);
  const addEmergencyContact = useMutation((api as any).patientProfile?.addEmergencyContact);
  const removeEmergencyContact = useMutation((api as any).patientProfile?.removeEmergencyContact);
  const [isSaving, setIsSaving] = useState(false);

  const [emergencyContacts, setEmergencyContacts] = useState(
    initialData?.emergencyContacts || []
  );
  const [healthcareProxy, setHealthcareProxy] = useState(initialData?.healthcareProxy || {
    name: '',
    relationship: '',
    phone: '',
    email: '',
    documentOnFile: false,
  });

  useEffect(() => {
    if (initialData) {
      setEmergencyContacts(initialData.emergencyContacts || []);
      setHealthcareProxy(initialData.healthcareProxy || {
        name: '',
        relationship: '',
        phone: '',
        email: '',
        documentOnFile: false,
      });
    }
  }, [initialData]);

  const handleAddContact = async () => {
    try {
      await addEmergencyContact({
        patientId,
        contact: {
          name: '',
          relationship: '',
          phone: '',
          email: '',
          isPrimary: emergencyContacts.length === 0,
        },
        userEmail: session?.user?.email,
      });
      toast.success('Contact added', {
        description: 'Please fill in the contact details.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to add contact.',
      });
    }
  };

  const handleRemoveContact = async (index: number) => {
    try {
      await removeEmergencyContact({
        patientId,
        index,
        userEmail: session?.user?.email,
      });
      toast.success('Contact removed', {
        description: 'The contact has been removed.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to remove contact.',
      });
    }
  };

  const handleSaveProxy = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        patientId,
        section: 'healthcareProxy',
        data: healthcareProxy,
        userEmail: session?.user?.email,
      });
      toast.success('Healthcare proxy updated', {
        description: 'Your healthcare proxy information has been saved.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save healthcare proxy.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Emergency Contacts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-text-primary">Emergency Contacts</h4>
            <p className="text-sm text-text-secondary mt-1">
              People to contact in case of emergency
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleAddContact}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {emergencyContacts.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-border-primary rounded-lg">
            <Phone className="h-12 w-12 text-text-tertiary mx-auto mb-2" />
            <p className="text-sm text-text-tertiary">No emergency contacts recorded</p>
          </div>
        ) : (
          <div className="space-y-4">
            {emergencyContacts.map((contact, index) => (
              <div key={index} className="p-4 border border-border-primary rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-zenthea-teal" />
                    <span className="font-medium text-text-primary">{contact.name}</span>
                    {contact.isPrimary && (
                      <span className="text-xs bg-status-success-bg text-status-success px-2 py-1 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveContact(index)}
                    className="text-status-error hover:text-status-error"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-text-secondary">Relationship:</span>{' '}
                    <span className="text-text-primary">{contact.relationship}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Phone:</span>{' '}
                    <span className="text-text-primary">{contact.phone}</span>
                  </div>
                  {contact.email && (
                    <div>
                      <span className="text-text-secondary">Email:</span>{' '}
                      <span className="text-text-primary">{contact.email}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Healthcare Proxy */}
      <div className="space-y-4 border-t border-border-primary pt-6">
        <div>
          <h4 className="text-sm font-semibold text-text-primary">Healthcare Proxy</h4>
          <p className="text-sm text-text-secondary mt-1">
            Person authorized to make medical decisions on your behalf
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="proxyName">Name</Label>
            <Input
              id="proxyName"
              value={healthcareProxy.name}
              onChange={(e) =>
                setHealthcareProxy({ ...healthcareProxy, name: e.target.value })
              }
              placeholder="Full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proxyRelationship">Relationship</Label>
            <Input
              id="proxyRelationship"
              value={healthcareProxy.relationship}
              onChange={(e) =>
                setHealthcareProxy({ ...healthcareProxy, relationship: e.target.value })
              }
              placeholder="e.g., Spouse, Adult Child"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proxyPhone">Phone</Label>
            <Input
              id="proxyPhone"
              type="tel"
              value={healthcareProxy.phone}
              onChange={(e) =>
                setHealthcareProxy({ ...healthcareProxy, phone: e.target.value })
              }
              placeholder="(555) 123-4567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proxyEmail">Email</Label>
            <Input
              id="proxyEmail"
              type="email"
              value={healthcareProxy.email || ''}
              onChange={(e) =>
                setHealthcareProxy({ ...healthcareProxy, email: e.target.value })
              }
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="proxyDocumentOnFile"
                checked={healthcareProxy.documentOnFile}
                onChange={(e) =>
                  setHealthcareProxy({
                    ...healthcareProxy,
                    documentOnFile: e.target.checked,
                  })
                }
                className="h-4 w-4 bg-surface-elevated text-interactive-primary border-border-primary rounded focus:ring-border-focus"
              />
              <Label htmlFor="proxyDocumentOnFile" className="cursor-pointer">
                Healthcare proxy document on file
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSaveProxy}
            disabled={isSaving}
            className="bg-zenthea-teal hover:bg-zenthea-teal-600"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Proxy Information
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

