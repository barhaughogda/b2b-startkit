"use client";

import React, { useState, useEffect } from "react";
import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useForm } from "react-hook-form";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Palette, Save, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/ui/back-button";
import { useClinicProfile } from "@/hooks/useClinicProfile";

interface BrandingFormData {
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

/**
 * Branding Settings Page
 * 
 * Allows clinic admins to customize their clinic's visual identity:
 * - Logo upload and management
 * - Brand colors (primary, secondary, accent)
 * - Favicon configuration
 */
export default function BrandingSettingsPage() {
  const { data: session, status } = useZentheaSession();
  const { 
    tenantData, 
    tenantId, 
    isLoading, 
    hasError, 
    canQuery, 
    updateBranding
  } = useClinicProfile();

  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
  } = useForm<BrandingFormData>({
    defaultValues: {
      logo: '',
      favicon: '',
      primaryColor: '#5FBFAF',
      secondaryColor: '#5F284A',
      accentColor: '',
    },
  });

  // Populate form when tenant data loads
  useEffect(() => {
    if (tenantData) {
      setValue('logo', tenantData.branding?.logo || '');
      setValue('favicon', tenantData.branding?.favicon || '');
      setValue('primaryColor', tenantData.branding?.primaryColor || '#5FBFAF');
      setValue('secondaryColor', tenantData.branding?.secondaryColor || '#5F284A');
      setValue('accentColor', tenantData.branding?.accentColor || '');
    }
  }, [tenantData, setValue]);

  const watchedLogo = watch('logo');
  const watchedFavicon = watch('favicon');
  const watchedPrimaryColor = watch('primaryColor');
  const watchedSecondaryColor = watch('secondaryColor');
  const watchedAccentColor = watch('accentColor');

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // TODO: Implement logo upload to S3/CDN
    // For now, just show a placeholder
    toast.error('Logo upload functionality coming soon');
  };

  const handleSaveBranding = async (data: BrandingFormData) => {
    if (!tenantId || !canQuery) {
      toast.error('Cannot save: Not properly configured');
      return;
    }

    setIsSaving(true);
    setActiveSection('branding');
    try {
      if (updateBranding && tenantId) {
        await updateBranding({
          tenantId,
          logo: data.logo || undefined,
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          accentColor: data.accentColor || undefined,
          favicon: data.favicon || undefined,
        });
        toast.success('Branding updated successfully');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update branding';
      toast.error(message);
    } finally {
      setIsSaving(false);
      setActiveSection(null);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zenthea-teal mx-auto"></div>
            <p className="mt-2 text-text-secondary">Loading branding settings...</p>
          </div>
        </div>
      </ClinicLayout>
    );
  }

  if (status === "unauthenticated") {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h2>
            <p className="text-text-secondary">Please sign in to access branding settings.</p>
          </div>
        </div>
      </ClinicLayout>
    );
  }

  if (!canQuery) {
    return (
      <ClinicLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <BackButton />
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 p-4 bg-status-warning/10 border border-status-warning rounded-md">
                <AlertCircle className="h-5 w-5 text-status-warning" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Not Authenticated
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Please sign in to access branding settings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ClinicLayout>
    );
  }

  if (hasError) {
    return (
      <ClinicLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <BackButton />
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 p-4 bg-status-error/10 border border-status-error rounded-md">
                <AlertCircle className="h-5 w-5 text-status-error" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Error loading branding settings
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    The branding settings could not be loaded. Please try refreshing the page.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ClinicLayout>
    );
  }

  return (
    <ClinicLayout>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <BackButton />
          
          {/* Header */}
          <div className="mt-6 mb-6">
            <h1 className="text-3xl font-bold text-text-primary">Branding Settings</h1>
            <p className="text-text-secondary mt-1">
              Customize your clinic&apos;s logo, colors, and visual identity
            </p>
          </div>

          <form onSubmit={handleSubmit(handleSaveBranding)} className="space-y-6">
            {/* Logo Section */}
            <Card>
              <CardHeader>
                <CardTitle>Logo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={watchedLogo || tenantData?.branding?.logo} alt="Clinic logo" />
                    <AvatarFallback className="text-lg font-medium bg-muted">
                      <Building2 className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Label htmlFor="logo-upload">Upload Logo</Label>
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="mt-2"
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      Recommended: Square image, at least 200x200 pixels
                    </p>
                  </div>
                </div>
                <Input
                  {...register('logo')}
                  placeholder="Or enter logo URL"
                  className="mt-2"
                />
              </CardContent>
            </Card>

            {/* Brand Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Brand Colors
                </CardTitle>
                <CardDescription>
                  Customize your organization&apos;s visual identity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Colors */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        {...register('primaryColor')}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        {...register('primaryColor')}
                        placeholder="#5FBFAF"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        {...register('secondaryColor')}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        {...register('secondaryColor')}
                        placeholder="#5F284A"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accentColor"
                        type="color"
                        {...register('accentColor')}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        {...register('accentColor')}
                        placeholder="#E8927C"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Color Preview */}
                <div className="bg-surface-secondary rounded-lg p-4">
                  <p className="text-sm text-text-secondary mb-3">Preview</p>
                  <div className="flex items-center gap-4">
                    <div 
                      className="h-12 w-12 rounded-lg"
                      style={{ backgroundColor: watchedPrimaryColor }}
                    />
                    <div 
                      className="h-12 w-12 rounded-lg"
                      style={{ backgroundColor: watchedSecondaryColor }}
                    />
                    <div 
                      className="h-12 w-12 rounded-lg"
                      style={{ backgroundColor: watchedAccentColor || '#E8927C' }}
                    />
                    <Button 
                      type="button"
                      size="sm"
                      style={{ backgroundColor: watchedPrimaryColor }}
                      className="text-white"
                    >
                      Sample Button
                    </Button>
                  </div>
                </div>

                {/* Favicon */}
                <div className="space-y-2">
                  <Label htmlFor="favicon">Favicon URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="favicon"
                      {...register('favicon')}
                      placeholder="https://your-cdn.com/favicon.ico"
                    />
                    {watchedFavicon && (
                      <div className="h-10 w-10 rounded border bg-surface-secondary flex items-center justify-center overflow-hidden">
                        <img 
                          src={watchedFavicon} 
                          alt="Favicon preview" 
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary">
                    Recommended: 32x32px, ICO or PNG format
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                type="submit"
                disabled={isSaving && activeSection === 'branding'}
                className="min-w-[120px]"
              >
                {isSaving && activeSection === 'branding' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Branding
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
    </ClinicLayout>
  );
}

