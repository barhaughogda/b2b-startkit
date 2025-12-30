"use client";

import React, { useState, useEffect } from "react";
import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Clock,
  Globe,
  Plus,
  Save,
  Loader2,
  Settings,
  MessageSquare,
  Shield,
  AlertCircle,
  Briefcase,
  UserCheck,
  UserX
} from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/ui/back-button";
import { TimezoneSelector } from "@/components/ui/timezone-selector";
import { OpeningHoursEditor } from "@/components/opening-hours/OpeningHoursEditor";
import { ProfileSection } from "@/components/patient/profile/ProfileSection";
import { ServiceEditor, ServiceCard, type ServiceData, type ServiceCardData } from "@/components/services";

/**
 * Booking Settings Page
 * 
 * Allows clinic admins to configure online booking:
 * - Company timezone
 * - Company opening hours
 * - Booking mode (full/request/account/disabled)
 * - Required fields
 * - Services (appointment types)
 * - Messages
 * 
 * Uses collapsible sections consistent with Company Settings page.
 */
export default function BookingSettingsPage() {
  const { data: session, status } = useZentheaSession();
  const tenantId = session?.user?.tenantId;

  // Collapsible sections state - default to all collapsed
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Service editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'duplicate'>('create');
  const [editingService, setEditingService] = useState<ServiceData | undefined>(undefined);

  // Fetch config
  const config = useQuery(
    api.bookingConfig.getBookingConfig,
    tenantId ? { tenantId } : "skip"
  );

  // Fetch tenant settings for timezone and currency
  const tenantSettings = useQuery(
    api.tenants.getTenantSettings,
    tenantId ? { tenantId } : "skip"
  );

  // Fetch public provider profiles for accepting new patients toggles
  const publicProviderProfiles = useQuery(
    api.publicProfiles.getPublicProfiles,
    tenantId ? { tenantId } : "skip"
  );

  // Mutations
  const updateMode = useMutation(api.bookingConfig.updateBookingMode);
  const updateRequirements = useMutation(api.bookingConfig.updateBookingRequirements);
  const addType = useMutation(api.bookingConfig.addAppointmentType);
  const updateType = useMutation(api.bookingConfig.updateAppointmentType);
  const deleteType = useMutation(api.bookingConfig.deleteAppointmentType);
  const updateTenantSettings = useMutation(api.tenants.updateTenantSettings);
  const updatePublicProfile = useMutation(api.publicProfiles.updatePublicProfile);

  // Track which provider is being updated
  const [updatingProviderId, setUpdatingProviderId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    mode: "disabled" as "full" | "request" | "account_required" | "disabled",
    requirePhone: false,
    requireInsurance: false,
    requireDateOfBirth: false,
    advanceBookingDays: 30,
    minimumNoticeHours: 24,
    welcomeMessage: "",
    confirmationMessage: "",
  });

  // Timezone state
  const [companyTimezone, setCompanyTimezone] = useState<string>("America/New_York");

  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Get tenant currency (default to USD)
  const tenantCurrency = tenantSettings?.settings?.currency || 'USD';

  // Populate form
  useEffect(() => {
    if (config?.bookingSettings) {
      setFormData({
        mode: config.bookingSettings.mode ?? "disabled",
        requirePhone: config.bookingSettings.requirePhone ?? false,
        requireInsurance: config.bookingSettings.requireInsurance ?? false,
        requireDateOfBirth: config.bookingSettings.requireDateOfBirth ?? false,
        advanceBookingDays: config.bookingSettings.advanceBookingDays ?? 30,
        minimumNoticeHours: config.bookingSettings.minimumNoticeHours ?? 24,
        welcomeMessage: config.bookingSettings.welcomeMessage ?? "",
        confirmationMessage: config.bookingSettings.confirmationMessage ?? "",
      });
    }
  }, [config]);

  // Populate timezone from tenant settings
  useEffect(() => {
    if (tenantSettings?.settings?.timezone) {
      setCompanyTimezone(tenantSettings.settings.timezone);
    }
  }, [tenantSettings]);

  // Loading state
  if (status === "loading" || config === undefined || tenantSettings === undefined) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
        </div>
      </ClinicLayout>
    );
  }

  // Auth check
  if (status === "unauthenticated" || !tenantId) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-text-secondary">Please sign in to access this page.</p>
        </div>
      </ClinicLayout>
    );
  }

  // Check if online scheduling is enabled
  if (!config?.features?.onlineScheduling) {
    return (
      <ClinicLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card>
            <CardContent className="py-16 text-center">
              <AlertCircle className="h-12 w-12 text-status-warning mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">
                Online Scheduling Not Enabled
              </h3>
              <p className="text-text-secondary max-w-md mx-auto">
                Online scheduling is not enabled for your organization. 
                Please contact support to enable this feature.
              </p>
            </CardContent>
          </Card>
        </div>
      </ClinicLayout>
    );
  }

  const services: ServiceCardData[] = (config?.bookingSettings?.appointmentTypes || []).map((s) => ({
    id: s.id,
    name: s.name,
    duration: s.duration,
    description: s.description,
    enabled: s.enabled,
    allowOnline: s.allowOnline ?? true,
    pricing: s.pricing,
    price: s.price,
    icon: s.icon,
  }));

  // Save company timezone
  const handleSaveTimezone = async () => {
    setIsSaving(true);
    setActiveSection("timezone");
    try {
      await updateTenantSettings({ 
        tenantId, 
        settings: { timezone: companyTimezone } 
      });
      toast.success("Company timezone updated");
    } catch {
      toast.error("Failed to update timezone");
    } finally {
      setIsSaving(false);
      setActiveSection(null);
    }
  };

  // Save booking mode
  const handleSaveMode = async () => {
    setIsSaving(true);
    setActiveSection("mode");
    try {
      await updateMode({ tenantId, mode: formData.mode });
      toast.success("Booking mode updated");
    } catch {
      toast.error("Failed to update booking mode");
    } finally {
      setIsSaving(false);
      setActiveSection(null);
    }
  };

  // Toggle provider accepting new patients status
  const handleToggleAcceptingNewPatients = async (profileId: string, currentValue: boolean) => {
    setUpdatingProviderId(profileId);
    try {
      await updatePublicProfile({
        profileId: profileId as any, // Cast to Id type
        acceptingNewPatients: !currentValue,
      });
      toast.success(!currentValue ? "Now accepting new patients" : "No longer accepting new patients");
    } catch {
      toast.error("Failed to update provider status");
    } finally {
      setUpdatingProviderId(null);
    }
  };

  // Save requirements
  const handleSaveRequirements = async () => {
    setIsSaving(true);
    setActiveSection("requirements");
    try {
      await updateRequirements({
        tenantId,
        requirePhone: formData.requirePhone,
        requireInsurance: formData.requireInsurance,
        requireDateOfBirth: formData.requireDateOfBirth,
        advanceBookingDays: formData.advanceBookingDays,
        minimumNoticeHours: formData.minimumNoticeHours,
        welcomeMessage: formData.welcomeMessage || undefined,
        confirmationMessage: formData.confirmationMessage || undefined,
      });
      toast.success("Booking settings updated");
    } catch {
      toast.error("Failed to update settings");
    } finally {
      setIsSaving(false);
      setActiveSection(null);
    }
  };

  // Open editor for creating a new service
  const handleAddServiceClick = () => {
    setEditingService(undefined);
    setEditorMode('create');
    setEditorOpen(true);
  };

  // Open editor for editing a service
  const handleEditService = (service: ServiceCardData) => {
    setEditingService({
      id: service.id,
      name: service.name,
      duration: service.duration,
      description: service.description,
      enabled: service.enabled,
      allowOnline: service.allowOnline,
      pricing: service.pricing,
      icon: service.icon,
    });
    setEditorMode('edit');
    setEditorOpen(true);
  };

  // Open editor for duplicating a service
  const handleDuplicateService = (service: ServiceCardData) => {
    setEditingService({
      id: service.id,
      name: service.name,
      duration: service.duration,
      description: service.description,
      enabled: service.enabled,
      allowOnline: service.allowOnline,
      pricing: service.pricing,
      icon: service.icon,
    });
    setEditorMode('duplicate');
    setEditorOpen(true);
  };

  // Save service (create, edit, or duplicate)
  const handleSaveService = async (data: ServiceData) => {
    if (editorMode === 'edit' && data.id) {
      // Update existing service
      await updateType({
        tenantId,
        typeId: data.id,
        name: data.name,
        duration: data.duration,
        description: data.description,
        enabled: data.enabled,
        allowOnline: data.allowOnline,
        pricing: data.pricing,
        icon: data.icon,
      });
      toast.success("Service updated");
    } else {
      // Create new service (for both create and duplicate)
      await addType({
        tenantId,
        name: data.name,
        duration: data.duration,
        description: data.description,
        allowOnline: data.allowOnline,
        pricing: data.pricing,
        icon: data.icon,
      });
      toast.success(editorMode === 'duplicate' ? "Service duplicated" : "Service added");
    }
  };

  // Toggle service enabled/disabled
  const handleToggleService = async (typeId: string, enabled: boolean) => {
    try {
      await updateType({ tenantId, typeId, enabled });
      toast.success(enabled ? "Service enabled" : "Service disabled");
    } catch {
      toast.error("Failed to update service");
    }
  };

  // Delete service
  const handleDeleteService = async (typeId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    try {
      await deleteType({ tenantId, typeId });
      toast.success("Service deleted");
    } catch {
      toast.error("Failed to delete service");
    }
  };

  return (
    <ClinicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <BackButton />
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Booking Settings</h1>
          <p className="text-text-secondary mt-1">
            Configure how patients can book appointments online
          </p>
        </div>

        <div className="space-y-4">
          {/* Company Timezone */}
          <ProfileSection
            title="Company Timezone"
            icon={Globe}
            isExpanded={expandedSections.has("timezone")}
            onToggle={() => toggleSection("timezone")}
          >
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Set the default timezone for your organization. Clinics can override this with their own timezone.
              </p>
              <TimezoneSelector
                value={companyTimezone}
                onChange={setCompanyTimezone}
                showLabel={false}
                placeholder="Select company timezone..."
              />
              <div className="bg-surface-secondary rounded-lg p-3 text-sm">
                <p className="text-text-secondary">
                  This timezone will be used as the default for all clinics that don&apos;t have their own timezone set.
                  It affects appointment scheduling, availability display, and opening hours.
                </p>
              </div>
              <Button 
                onClick={handleSaveTimezone}
                disabled={isSaving && activeSection === "timezone"}
              >
                {isSaving && activeSection === "timezone" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Timezone
              </Button>
            </div>
          </ProfileSection>

          {/* Company Opening Hours */}
          <ProfileSection
            title="Company Opening Hours"
            icon={Clock}
            isExpanded={expandedSections.has("hours")}
            onToggle={() => toggleSection("hours")}
          >
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Set default opening hours for your organization. Individual clinics can override these with their own hours.
              </p>
              <OpeningHoursEditor
                tenantId={tenantId}
                userEmail={session?.user?.email || ''}
                title="Default Opening Hours"
                description="These hours will be used as defaults for all clinics that don't have their own hours set."
              />
            </div>
          </ProfileSection>

          {/* Booking Mode */}
          <ProfileSection
            title="Booking Mode"
            icon={Settings}
            isExpanded={expandedSections.has("mode")}
            onToggle={() => toggleSection("mode")}
          >
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Choose how patients can request appointments
              </p>
              <Select
                value={formData.mode}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  mode: value as typeof formData.mode 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">
                    <div className="flex items-center gap-2">
                      <span>Disabled</span>
                      <span className="text-text-tertiary text-xs">- No online booking</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="request">
                    <div className="flex items-center gap-2">
                      <span>Request Only</span>
                      <span className="text-text-tertiary text-xs">- Patients submit requests</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="account_required">
                    <div className="flex items-center gap-2">
                      <span>Account Required</span>
                      <span className="text-text-tertiary text-xs">- Must login first</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="full">
                    <div className="flex items-center gap-2">
                      <span>Full Booking</span>
                      <span className="text-text-tertiary text-xs">- Direct scheduling</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="bg-surface-secondary rounded-lg p-3 text-sm">
                {formData.mode === "disabled" && (
                  <p className="text-text-secondary">Online booking is disabled. Patients must call to schedule.</p>
                )}
                {formData.mode === "request" && (
                  <p className="text-text-secondary">Patients can submit booking requests. Your staff will review and confirm appointments.</p>
                )}
                {formData.mode === "account_required" && (
                  <p className="text-text-secondary">Patients must create an account or login before booking appointments.</p>
                )}
                {formData.mode === "full" && (
                  <p className="text-text-secondary">Patients can view availability and book appointments directly without staff approval.</p>
                )}
              </div>

              <Button 
                onClick={handleSaveMode}
                disabled={isSaving && activeSection === "mode"}
              >
                {isSaving && activeSection === "mode" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Mode
              </Button>
            </div>
          </ProfileSection>

          {/* Provider Availability */}
          <ProfileSection
            title="Provider Availability"
            icon={UserCheck}
            isExpanded={expandedSections.has("providers")}
            onToggle={() => toggleSection("providers")}
          >
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Control which providers can accept new patients through online booking.
                Providers not accepting new patients will still appear in listings but will be blocked for unauthenticated users.
              </p>
              
              {publicProviderProfiles && publicProviderProfiles.length > 0 ? (
                <div className="space-y-3">
                  {publicProviderProfiles.map((provider) => (
                    <div 
                      key={provider._id}
                      className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg border border-border-primary"
                    >
                      <div className="flex items-center gap-3">
                        {provider.photo ? (
                          <img 
                            src={provider.photo} 
                            alt={provider.displayName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-interactive-primary/10 flex items-center justify-center">
                            <UserCheck className="w-5 h-5 text-interactive-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-text-primary">{provider.displayName}</p>
                          <p className="text-sm text-text-secondary">{provider.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {provider.acceptingNewPatients ? (
                          <span className="flex items-center gap-1 text-sm text-status-success">
                            <UserCheck className="w-4 h-4" />
                            Accepting
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-text-tertiary">
                            <UserX className="w-4 h-4" />
                            Not accepting
                          </span>
                        )}
                        <Switch
                          checked={provider.acceptingNewPatients}
                          onCheckedChange={() => handleToggleAcceptingNewPatients(
                            provider._id,
                            provider.acceptingNewPatients
                          )}
                          disabled={updatingProviderId === provider._id}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-border-primary rounded-lg p-8 text-center">
                  <UserCheck className="h-8 w-8 mx-auto text-text-tertiary mb-2" />
                  <p className="text-text-secondary mb-2">No public provider profiles found</p>
                  <p className="text-sm text-text-tertiary">
                    Add providers to your public profiles from the Team Management page to manage their availability here.
                  </p>
                </div>
              )}

              <div className="bg-surface-secondary rounded-lg p-3 text-sm">
                <p className="text-text-secondary">
                  <strong>Note:</strong> When a provider is not accepting new patients, they will still appear in the booking flow 
                  but unauthenticated users will see a message prompting them to sign in as an existing patient.
                </p>
              </div>
            </div>
          </ProfileSection>

          {/* Booking Requirements */}
          <ProfileSection
            title="Booking Requirements"
            icon={Shield}
            isExpanded={expandedSections.has("requirements")}
            onToggle={() => toggleSection("requirements")}
          >
            <div className="space-y-6">
              <p className="text-sm text-text-secondary">
                Configure what information is required for booking
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                  <Label htmlFor="requirePhone">Phone Number</Label>
                  <Switch
                    id="requirePhone"
                    checked={formData.requirePhone}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requirePhone: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                  <Label htmlFor="requireDob">Date of Birth</Label>
                  <Switch
                    id="requireDob"
                    checked={formData.requireDateOfBirth}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireDateOfBirth: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                  <Label htmlFor="requireInsurance">Insurance Info</Label>
                  <Switch
                    id="requireInsurance"
                    checked={formData.requireInsurance}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requireInsurance: checked }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="advanceBookingDays">Max Days in Advance</Label>
                  <Input
                    id="advanceBookingDays"
                    type="number"
                    min={1}
                    max={365}
                    value={formData.advanceBookingDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, advanceBookingDays: parseInt(e.target.value) || 30 }))}
                  />
                  <p className="text-xs text-text-tertiary">How many days ahead patients can book</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimumNoticeHours">Minimum Notice (hours)</Label>
                  <Input
                    id="minimumNoticeHours"
                    type="number"
                    min={0}
                    max={168}
                    value={formData.minimumNoticeHours}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimumNoticeHours: parseInt(e.target.value) || 24 }))}
                  />
                  <p className="text-xs text-text-tertiary">Minimum hours before appointment</p>
                </div>
              </div>

              <Button 
                onClick={handleSaveRequirements}
                disabled={isSaving && activeSection === "requirements"}
              >
                {isSaving && activeSection === "requirements" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Requirements
              </Button>
            </div>
          </ProfileSection>

          {/* Services */}
          <ProfileSection
            title="Services"
            icon={Briefcase}
            isExpanded={expandedSections.has("services")}
            onToggle={() => toggleSection("services")}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">
                  Define the services patients can book. These also appear on your website.
                </p>
                <Button onClick={handleAddServiceClick}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Service
                </Button>
              </div>
              
              {/* Services list */}
              {services.length > 0 ? (
                <div className="space-y-3">
                  {services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      tenantCurrency={tenantCurrency}
                      onEdit={handleEditService}
                      onDuplicate={handleDuplicateService}
                      onDelete={handleDeleteService}
                      onToggleEnabled={handleToggleService}
                    />
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-border-primary rounded-lg p-8 text-center">
                  <Briefcase className="h-8 w-8 mx-auto text-text-tertiary mb-2" />
                  <p className="text-text-secondary mb-4">No services configured yet</p>
                  <Button onClick={handleAddServiceClick} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add your first service
                  </Button>
                </div>
              )}
            </div>
          </ProfileSection>

          {/* Booking Messages */}
          <ProfileSection
            title="Booking Messages"
            icon={MessageSquare}
            isExpanded={expandedSections.has("messages")}
            onToggle={() => toggleSection("messages")}
          >
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Customize messages shown to patients during booking
              </p>
              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Welcome Message</Label>
                <Textarea
                  id="welcomeMessage"
                  value={formData.welcomeMessage}
                  onChange={(e) => setFormData(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                  placeholder="Welcome! Please fill out the form below to request an appointment."
                  rows={2}
                />
                <p className="text-xs text-text-tertiary">Shown at the top of the booking page</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmationMessage">Confirmation Message</Label>
                <Textarea
                  id="confirmationMessage"
                  value={formData.confirmationMessage}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmationMessage: e.target.value }))}
                  placeholder="Thank you! We will contact you shortly to confirm your appointment."
                  rows={2}
                />
                <p className="text-xs text-text-tertiary">Shown after booking is submitted</p>
              </div>
              <Button 
                onClick={handleSaveRequirements}
                disabled={isSaving && activeSection === "requirements"}
              >
                {isSaving && activeSection === "requirements" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Messages
              </Button>
            </div>
          </ProfileSection>
        </div>
      </div>

      {/* Service Editor Sheet */}
      <ServiceEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        service={editingService}
        onSave={handleSaveService}
        mode={editorMode}
        tenantCurrency={tenantCurrency}
        tenantId={tenantId}
      />
    </ClinicLayout>
  );
}
