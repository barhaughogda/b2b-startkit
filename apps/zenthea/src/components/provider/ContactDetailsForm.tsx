'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Edit3, X, Plus, Trash2, Mail, Phone, Clock, Globe, Languages } from 'lucide-react';

type ContactMethod = 'email' | 'phone' | 'portal';

interface ContactDetailsFormProps {
  provider: {
    phone?: string;
    preferredContactMethod?: ContactMethod;
    officeHours?: string;
    languages?: string[];
    certifications?: string[];
  };
  onSave: (data: {
    phone: string;
    preferredContactMethod: ContactMethod;
    officeHours: string;
    languages: string[];
    certifications: string[];
  }) => void;
  isEditing: boolean;
}

export function ContactDetailsForm({ provider, onSave, isEditing }: ContactDetailsFormProps) {
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    phone: provider.phone || '',
    preferredContactMethod: provider.preferredContactMethod || 'email',
    officeHours: provider.officeHours || '',
    languages: provider.languages || ['English'],
    certifications: provider.certifications || [],
  });
  const [newLanguage, setNewLanguage] = useState('');
  const [newCertification, setNewCertification] = useState('');

  useEffect(() => {
    setFormData({
      phone: provider.phone || '',
      preferredContactMethod: provider.preferredContactMethod || 'email',
      officeHours: provider.officeHours || '',
      languages: provider.languages || ['English'],
      certifications: provider.certifications || [],
    });
  }, [provider]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
      setIsEditingContact(false);
    } catch (error) {
      console.error('Error saving contact details:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save when form data changes
  useEffect(() => {
    if (isEditing && JSON.stringify(formData) !== JSON.stringify({
      phone: provider.phone || '',
      preferredContactMethod: provider.preferredContactMethod || 'email',
      officeHours: provider.officeHours || '',
      languages: provider.languages || ['English'],
      certifications: provider.certifications || [],
    })) {
      const timeoutId = setTimeout(() => {
        onSave(formData);
      }, 1000); // Auto-save after 1 second of no changes

      return () => clearTimeout(timeoutId);
    }
  }, [formData, provider, isEditing, onSave]);

  const handleCancel = () => {
    setFormData({
      phone: provider.phone || '',
      preferredContactMethod: provider.preferredContactMethod || 'email',
      officeHours: provider.officeHours || '',
      languages: provider.languages || ['English'],
      certifications: provider.certifications || [],
    });
    setIsEditingContact(false);
  };

  const addLanguage = () => {
    const normalizedLanguage = newLanguage.trim().toLowerCase();
    const normalizedExisting = formData.languages.map(lang => lang.toLowerCase());
    
    if (newLanguage.trim() && !normalizedExisting.includes(normalizedLanguage)) {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, newLanguage.trim()]
      }));
      setNewLanguage('');
    }
  };

  const removeLanguage = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l !== language)
    }));
  };

  const addCertification = () => {
    if (newCertification.trim() && !formData.certifications.includes(newCertification.trim())) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCertification.trim()]
      }));
      setNewCertification('');
    }
  };

  const removeCertification = (certification: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c !== certification)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Phone Number</Label>
                  <p className="text-text-primary">{formData.phone || 'Not provided'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Preferred Contact Method</Label>
                  <p className="text-text-primary capitalize">{formData.preferredContactMethod}</p>
                </div>
              </div>
              
              {formData.officeHours && (
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Office Hours</Label>
                  <p className="text-text-primary">{formData.officeHours}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    pattern="[\(\)\d\s\-\+]+"
                    title="Please enter a valid phone number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contactMethod">Preferred Contact Method</Label>
                  <Select
                    value={formData.preferredContactMethod}
                    onValueChange={(value: ContactMethod) => setFormData(prev => ({ ...prev, preferredContactMethod: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="portal">Patient Portal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="officeHours">Office Hours</Label>
                <Input
                  id="officeHours"
                  value={formData.officeHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, officeHours: e.target.value }))}
                  placeholder="e.g., Monday-Friday 9:00 AM - 5:00 PM"
                />
              </div>

            </div>
          )}
        </CardContent>
      </Card>

      {/* Languages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Languages Spoken
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isEditing ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {formData.languages.map((language, index) => (
                  <Badge key={index} variant="secondary">
                    {language}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {formData.languages.map((language, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {language}
                    <button
                      onClick={() => removeLanguage(language)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  placeholder="Add a language"
                  onKeyPress={(e) => e.key === 'Enter' && addLanguage()}
                />
                <Button onClick={addLanguage} size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Professional Certifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isEditing ? (
            <div className="space-y-4">
              {formData.certifications.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.certifications.map((certification, index) => (
                    <Badge key={index} variant="outline">
                      {certification}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-text-secondary">No certifications added yet.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {formData.certifications.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.certifications.map((certification, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {certification}
                      <button
                        onClick={() => removeCertification(certification)}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  value={newCertification}
                  onChange={(e) => setNewCertification(e.target.value)}
                  placeholder="Add a certification"
                  onKeyPress={(e) => e.key === 'Enter' && addCertification()}
                />
                <Button onClick={addCertification} size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
