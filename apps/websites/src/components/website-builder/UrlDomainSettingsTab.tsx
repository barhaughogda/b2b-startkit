'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, Save, Loader2, Eye, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useClinicProfile } from '@/hooks/useClinicProfile';
import { generateSlug, isValidSlug } from '@/lib/tenant-routing';

// =============================================================================
// TYPES
// =============================================================================

interface UrlDomainFormData {
  slug: string;
  preferredAccess: 'path' | 'subdomain' | 'custom';
  subdomain: string;
  customDomain: string;
}

interface UrlDomainSettingsTabProps {
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function UrlDomainSettingsTab({ disabled }: UrlDomainSettingsTabProps) {
  const { 
    tenantData, 
    tenantId, 
    canQuery, 
    updateSlug,
    updateDomains
  } = useClinicProfile();

  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const {
    register,
    setValue,
    watch,
  } = useForm<UrlDomainFormData>({
    defaultValues: {
      slug: '',
      preferredAccess: 'path',
      subdomain: '',
      customDomain: '',
    },
  });

  // Populate form when tenant data loads
  useEffect(() => {
    if (tenantData) {
      setValue('slug', tenantData.slug || '');
      setValue('preferredAccess', tenantData.domains?.preferredAccess || 'path');
      setValue('subdomain', tenantData.domains?.subdomain || '');
      setValue('customDomain', tenantData.domains?.customDomain || '');
    }
  }, [tenantData, setValue]);

  const clinicName = tenantData?.name || 'Clinic';
  const watchedSlug = watch('slug');
  const watchedPreferredAccess = watch('preferredAccess');
  const watchedSubdomain = watch('subdomain');
  const watchedCustomDomain = watch('customDomain');

  // Generate slug from name
  const handleGenerateSlug = () => {
    const newSlug = generateSlug(clinicName);
    setValue('slug', newSlug);
  };

  // Preview URL based on current settings
  const previewUrl = (() => {
    if (watchedPreferredAccess === 'custom' && watchedCustomDomain) {
      return `https://${watchedCustomDomain}`;
    }
    if (watchedPreferredAccess === 'subdomain' && watchedSubdomain) {
      return `https://${watchedSubdomain}.zenthea.ai`;
    }
    if (watchedSlug) {
      return `https://zenthea.ai/clinic/${watchedSlug}`;
    }
    return 'https://zenthea.ai/clinic/your-clinic';
  })();

  // Save URL slug
  const handleSaveSlug = async () => {
    const slug = watch('slug');
    if (!isValidSlug(slug)) {
      toast.error('Invalid URL format. Use lowercase letters, numbers, and hyphens.');
      return;
    }

    if (!tenantId || !canQuery) {
      toast.error('Cannot save: Not properly configured');
      return;
    }

    setIsSaving(true);
    setActiveSection('slug');
    try {
      await updateSlug({
        tenantId,
        slug,
      });
      toast.success('URL updated');
    } catch (error: unknown) {
      let message = 'Failed to update URL';
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        // Provide more specific error messages for common cases
        if (errorMessage.includes('already') || errorMessage.includes('taken') || errorMessage.includes('exists')) {
          message = 'This URL is already taken. Please choose a different one.';
        } else if (errorMessage.includes('invalid') || errorMessage.includes('format')) {
          message = 'Invalid URL format. Use lowercase letters, numbers, and hyphens.';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          message = 'Network error. Please check your connection and try again.';
        } else {
          message = error.message;
        }
      }
      toast.error(message);
    } finally {
      setIsSaving(false);
      setActiveSection(null);
    }
  };

  // Save domain settings
  const handleSaveDomains = async () => {
    if (!tenantId || !canQuery) {
      toast.error('Cannot save: Not properly configured');
      return;
    }

    setIsSaving(true);
    setActiveSection('domains');
    try {
      await updateDomains({
        tenantId,
        subdomain: watch('subdomain') || undefined,
        customDomain: watch('customDomain') || undefined,
        preferredAccess: watch('preferredAccess'),
      });
      toast.success('Domain settings updated');
    } catch (error: unknown) {
      let message = 'Failed to update domain settings';
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        // Provide more specific error messages for common cases
        if (errorMessage.includes('already') || errorMessage.includes('taken') || errorMessage.includes('exists')) {
          message = 'This domain or subdomain is already in use. Please choose a different one.';
        } else if (errorMessage.includes('invalid') || errorMessage.includes('format')) {
          message = 'Invalid domain format. Please check your domain name.';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          message = 'Network error. Please check your connection and try again.';
        } else if (errorMessage.includes('dns') || errorMessage.includes('verification')) {
          message = 'DNS verification failed. Please ensure your DNS records are configured correctly.';
        } else {
          message = error.message;
        }
      }
      toast.error(message);
    } finally {
      setIsSaving(false);
      setActiveSection(null);
    }
  };

  // Show loading state if data isn't ready
  if (!canQuery) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center p-4 bg-status-warning/10 border border-status-warning rounded-md">
          <p className="text-sm font-medium text-text-primary">Not Authenticated</p>
          <p className="text-xs text-text-secondary mt-1">Please sign in to manage URL settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5 text-text-secondary" />
        <div>
          <h3 className="font-semibold text-text-primary">URL & Domain Settings</h3>
          <p className="text-sm text-text-secondary">
            Configure how patients access your landing page
          </p>
        </div>
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug">URL Slug</Label>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center bg-surface-secondary rounded-md border">
            <span className="px-3 text-text-tertiary text-sm">zenthea.ai/clinic/</span>
            <Input
              id="slug"
              {...register('slug')}
              onChange={(e) => setValue('slug', e.target.value.toLowerCase())}
              placeholder="your-clinic"
              className="border-0 bg-transparent"
              disabled={disabled}
            />
          </div>
          <Button 
            type="button"
            variant="outline" 
            onClick={handleGenerateSlug}
            title="Generate from name"
            disabled={disabled}
          >
            Generate
          </Button>
        </div>
        <p className="text-xs text-text-tertiary">
          Lowercase letters, numbers, and hyphens only. Must start with a letter.
        </p>
        <Button 
          type="button"
          size="sm"
          onClick={handleSaveSlug}
          disabled={disabled || (isSaving && activeSection === 'slug')}
        >
          {isSaving && activeSection === 'slug' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Slug
        </Button>
      </div>

      <div className="border-t border-border-primary" />

      {/* Access Method */}
      <div className="space-y-2">
        <Label>Preferred Access Method</Label>
        <Select
          value={watchedPreferredAccess}
          onValueChange={(value) => setValue('preferredAccess', value as UrlDomainFormData['preferredAccess'])}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="path">
              Path-based (zenthea.ai/clinic/your-clinic)
            </SelectItem>
            <SelectItem value="subdomain">
              Subdomain (your-clinic.zenthea.ai)
            </SelectItem>
            <SelectItem value="custom">
              Custom Domain (yourdomain.com)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Subdomain (if selected) */}
      {watchedPreferredAccess === 'subdomain' && (
        <div className="space-y-2">
          <Label htmlFor="subdomain">Subdomain</Label>
          <div className="flex items-center bg-surface-secondary rounded-md border">
            <Input
              id="subdomain"
              {...register('subdomain')}
              onChange={(e) => setValue('subdomain', e.target.value.toLowerCase())}
              placeholder="your-clinic"
              className="border-0 bg-transparent"
              disabled={disabled}
            />
            <span className="px-3 text-text-tertiary text-sm">.zenthea.ai</span>
          </div>
        </div>
      )}

      {/* Custom Domain (if selected) */}
      {watchedPreferredAccess === 'custom' && (
        <div className="space-y-2">
          <Label htmlFor="customDomain">Custom Domain</Label>
          <Input
            id="customDomain"
            {...register('customDomain')}
            onChange={(e) => setValue('customDomain', e.target.value.toLowerCase())}
            placeholder="portal.yourdomain.com"
            disabled={disabled}
          />
          <div className="bg-status-info/10 rounded-lg p-3 text-sm">
            <p className="font-medium text-status-info mb-1">DNS Configuration Required</p>
            <p className="text-text-secondary">
              Add a CNAME record pointing to <code className="bg-surface-secondary px-1 rounded">cname.vercel-dns.com</code>
            </p>
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="bg-surface-secondary rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="h-4 w-4 text-text-tertiary" />
          <span className="text-sm text-text-secondary">Your landing page URL:</span>
        </div>
        <a 
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zenthea-teal hover:underline flex items-center gap-1"
        >
          {previewUrl}
          <LinkIcon className="h-3 w-3" />
        </a>
      </div>

      <Button 
        type="button"
        onClick={handleSaveDomains}
        disabled={disabled || (isSaving && activeSection === 'domains')}
      >
        {isSaving && activeSection === 'domains' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Save Domain Settings
      </Button>
    </div>
  );
}

export default UrlDomainSettingsTab;

