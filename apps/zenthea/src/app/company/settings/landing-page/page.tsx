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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Eye,
  EyeOff,
  Save,
  Loader2,
  ExternalLink,
  Image as ImageIcon,
  Type,
  Layout,
  Calendar,
  Users,
  Building2,
  MessageSquare,
  Heart,
  Plus,
  Trash2,
  GripVertical,
  Power
} from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/ui/back-button";

/**
 * Landing Page Configuration Page
 * 
 * Allows clinic admins to configure their public landing page:
 * - Enable/disable landing page
 * - Hero section (title, subtitle, image, CTA)
 * - Module toggles (booking, care team, clinics, etc.)
 * - Custom sections
 */
export default function LandingPageSettingsPage() {
  const { data: session, status } = useZentheaSession();
  const tenantId = session?.user?.tenantId;

  // Fetch current config
  const config = useQuery(
    api.landingPage.getLandingPageConfig,
    tenantId ? { tenantId } : "skip"
  );

  // Mutations
  const updateEnabled = useMutation(api.landingPage.updateLandingPageEnabled);
  const updateHero = useMutation(api.landingPage.updateHeroSection);
  const updateModules = useMutation(api.landingPage.updateLandingPageModules);
  const addSection = useMutation(api.landingPage.addCustomSection);
  const updateSection = useMutation(api.landingPage.updateCustomSection);
  const deleteSection = useMutation(api.landingPage.deleteCustomSection);

  // Form state
  const [formData, setFormData] = useState({
    enabled: false,
    heroTitle: "",
    heroSubtitle: "",
    heroImage: "",
    heroCtaText: "",
    heroCtaLink: "",
    showBooking: true,
    showCareTeam: true,
    showClinics: true,
    showTestimonials: false,
    showServices: true,
  });

  const [newSection, setNewSection] = useState({ title: "", content: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Populate form with current data
  useEffect(() => {
    if (config?.landingPage) {
      setFormData({
        enabled: config.landingPage.enabled ?? false,
        heroTitle: config.landingPage.heroTitle ?? "",
        heroSubtitle: config.landingPage.heroSubtitle ?? "",
        heroImage: config.landingPage.heroImage ?? "",
        heroCtaText: config.landingPage.heroCtaText ?? "",
        heroCtaLink: config.landingPage.heroCtaLink ?? "",
        showBooking: config.landingPage.showBooking ?? true,
        showCareTeam: config.landingPage.showCareTeam ?? true,
        showClinics: config.landingPage.showClinics ?? true,
        showTestimonials: config.landingPage.showTestimonials ?? false,
        showServices: config.landingPage.showServices ?? true,
      });
    }
  }, [config]);

  // Loading state
  if (status === "loading" || config === undefined) {
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

  // Preview URL
  const previewUrl = config?.slug 
    ? `https://zenthea.ai/clinic/${config.slug}`
    : null;

  // Toggle landing page enabled
  const handleToggleEnabled = async () => {
    setIsSaving(true);
    try {
      await updateEnabled({
        tenantId,
        enabled: !formData.enabled,
      });
      setFormData(prev => ({ ...prev, enabled: !prev.enabled }));
      toast.success(formData.enabled ? "Landing page disabled" : "Landing page enabled");
    } catch (error: unknown) {
      toast.error("Failed to update status");
    } finally {
      setIsSaving(false);
    }
  };

  // Save hero section
  const handleSaveHero = async () => {
    setIsSaving(true);
    setActiveSection("hero");
    try {
      await updateHero({
        tenantId,
        heroTitle: formData.heroTitle || undefined,
        heroSubtitle: formData.heroSubtitle || undefined,
        heroImage: formData.heroImage || undefined,
        heroCtaText: formData.heroCtaText || undefined,
        heroCtaLink: formData.heroCtaLink || undefined,
      });
      toast.success("Hero section updated");
    } catch (error: unknown) {
      toast.error("Failed to update hero section");
    } finally {
      setIsSaving(false);
      setActiveSection(null);
    }
  };

  // Save module toggles
  const handleSaveModules = async () => {
    setIsSaving(true);
    setActiveSection("modules");
    try {
      await updateModules({
        tenantId,
        showBooking: formData.showBooking,
        showCareTeam: formData.showCareTeam,
        showClinics: formData.showClinics,
        showTestimonials: formData.showTestimonials,
        showServices: formData.showServices,
      });
      toast.success("Section visibility updated");
    } catch (error: unknown) {
      toast.error("Failed to update sections");
    } finally {
      setIsSaving(false);
      setActiveSection(null);
    }
  };

  // Add custom section
  const handleAddSection = async () => {
    if (!newSection.title.trim()) {
      toast.error("Please enter a section title");
      return;
    }

    setIsSaving(true);
    try {
      await addSection({
        tenantId,
        title: newSection.title,
        content: newSection.content,
      });
      setNewSection({ title: "", content: "" });
      toast.success("Custom section added");
    } catch (error: unknown) {
      toast.error("Failed to add section");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete custom section
  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return;

    try {
      await deleteSection({ tenantId, sectionId });
      toast.success("Section deleted");
    } catch (error: unknown) {
      toast.error("Failed to delete section");
    }
  };

  // Toggle custom section enabled
  const handleToggleSection = async (sectionId: string, enabled: boolean) => {
    try {
      await updateSection({ tenantId, sectionId, enabled });
      toast.success(enabled ? "Section enabled" : "Section disabled");
    } catch (error: unknown) {
      toast.error("Failed to update section");
    }
  };

  const customSections = config?.landingPage?.customSections || [];

  return (
    <ClinicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <BackButton />
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Landing Page</h1>
            <p className="text-text-secondary mt-1">
              Customize your public-facing landing page
            </p>
          </div>
          <div className="flex items-center gap-4">
            {previewUrl && (
              <a 
                href={previewUrl} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </a>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.enabled}
                onCheckedChange={handleToggleEnabled}
                disabled={isSaving}
              />
              <Badge variant={formData.enabled ? "default" : "outline"}>
                {formData.enabled ? "Live" : "Disabled"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Hero Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Hero Section
              </CardTitle>
              <CardDescription>
                The main banner at the top of your landing page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="heroTitle">Headline</Label>
                  <Input
                    id="heroTitle"
                    value={formData.heroTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, heroTitle: e.target.value }))}
                    placeholder={`Welcome to ${config?.name || 'Our Clinic'}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heroCtaText">Button Text</Label>
                  <Input
                    id="heroCtaText"
                    value={formData.heroCtaText}
                    onChange={(e) => setFormData(prev => ({ ...prev, heroCtaText: e.target.value }))}
                    placeholder="Book an Appointment"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="heroSubtitle">Subtitle</Label>
                <Textarea
                  id="heroSubtitle"
                  value={formData.heroSubtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, heroSubtitle: e.target.value }))}
                  placeholder="Quality healthcare for you and your family"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="heroImage">Background Image URL</Label>
                  <Input
                    id="heroImage"
                    value={formData.heroImage}
                    onChange={(e) => setFormData(prev => ({ ...prev, heroImage: e.target.value }))}
                    placeholder="https://your-cdn.com/hero-image.jpg"
                  />
                  <p className="text-xs text-text-tertiary">
                    Leave empty to use your brand colors as background
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heroCtaLink">Button Link</Label>
                  <Input
                    id="heroCtaLink"
                    value={formData.heroCtaLink}
                    onChange={(e) => setFormData(prev => ({ ...prev, heroCtaLink: e.target.value }))}
                    placeholder="/book (default)"
                  />
                </div>
              </div>

              <Button 
                onClick={handleSaveHero}
                disabled={isSaving && activeSection === "hero"}
              >
                {isSaving && activeSection === "hero" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Hero Section
              </Button>
            </CardContent>
          </Card>

          {/* Section Toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Power className="h-5 w-5" />
                Page Sections
              </CardTitle>
              <CardDescription>
                Choose which sections to display on your landing page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Services Section */}
                <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <Heart className="h-5 w-5 text-text-tertiary" />
                    <div>
                      <p className="font-medium">Services</p>
                      <p className="text-sm text-text-tertiary">Show your service offerings</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.showServices}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showServices: checked }))}
                  />
                </div>

                {/* Care Team Section */}
                <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-text-tertiary" />
                    <div>
                      <p className="font-medium">Care Team</p>
                      <p className="text-sm text-text-tertiary">Display your providers</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.showCareTeam}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showCareTeam: checked }))}
                  />
                </div>

                {/* Clinics Section */}
                <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-text-tertiary" />
                    <div>
                      <p className="font-medium">Locations</p>
                      <p className="text-sm text-text-tertiary">Show clinic locations</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.showClinics}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showClinics: checked }))}
                  />
                </div>

                {/* Booking Section */}
                <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-text-tertiary" />
                    <div>
                      <p className="font-medium">Booking</p>
                      <p className="text-sm text-text-tertiary">Online appointment booking</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.showBooking}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showBooking: checked }))}
                    disabled={!config?.features?.onlineScheduling}
                  />
                </div>

                {/* Testimonials Section */}
                <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-text-tertiary" />
                    <div>
                      <p className="font-medium">Testimonials</p>
                      <p className="text-sm text-text-tertiary">Patient reviews (coming soon)</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.showTestimonials}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showTestimonials: checked }))}
                    disabled
                  />
                </div>
              </div>

              <Button 
                onClick={handleSaveModules}
                disabled={isSaving && activeSection === "modules"}
              >
                {isSaving && activeSection === "modules" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Section Settings
              </Button>
            </CardContent>
          </Card>

          {/* Custom Sections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                Custom Sections
              </CardTitle>
              <CardDescription>
                Add additional content sections to your landing page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing custom sections */}
              {customSections.length > 0 && (
                <div className="space-y-3">
                  {customSections.map((section: any) => (
                    <div 
                      key={section.id}
                      className="flex items-start gap-3 p-4 bg-surface-secondary rounded-lg"
                    >
                      <GripVertical className="h-5 w-5 text-text-tertiary cursor-grab mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{section.title}</h4>
                          {!section.enabled && (
                            <Badge variant="outline" className="text-xs">Hidden</Badge>
                          )}
                        </div>
                        <p className="text-sm text-text-secondary line-clamp-2">
                          {section.content}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={section.enabled}
                          onCheckedChange={(checked) => handleToggleSection(section.id, checked)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSection(section.id)}
                          className="text-status-error hover:bg-status-error/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new section */}
              <div className="border border-dashed border-border-primary rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-text-primary">Add New Section</h4>
                <div className="space-y-2">
                  <Label htmlFor="newSectionTitle">Section Title</Label>
                  <Input
                    id="newSectionTitle"
                    value={newSection.title}
                    onChange={(e) => setNewSection(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="About Us"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newSectionContent">Content</Label>
                  <Textarea
                    id="newSectionContent"
                    value={newSection.content}
                    onChange={(e) => setNewSection(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Tell visitors about your clinic..."
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={handleAddSection}
                  disabled={isSaving || !newSection.title.trim()}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Section
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ClinicLayout>
  );
}

