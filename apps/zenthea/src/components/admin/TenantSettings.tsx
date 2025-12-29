"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  Palette,
  Zap,
  CreditCard,
  Phone,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Upload,
} from "lucide-react";

interface TenantSettingsData {
  // Branding
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    customDomain?: string;
    favicon?: string;
  };

  // Features
  features: {
    onlineScheduling: boolean;
    telehealth: boolean;
    prescriptionRefills: boolean;
    labResults: boolean;
    messaging: boolean;
    billing: boolean;
    patientPortal: boolean;
    mobileApp: boolean;
  };

  // Subscription
  subscription: {
    plan: "demo" | "basic" | "premium" | "enterprise";
    status: "active" | "cancelled" | "expired";
    maxUsers: number;
    maxPatients: number;
  };

  // Contact Info
  contactInfo: {
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    website?: string;
  };
}

interface TenantSettingsProps {
  className?: string;
}

const DEFAULT_TENANT_SETTINGS: TenantSettingsData = {
  branding: {
    primaryColor: "#2563eb",
    secondaryColor: "#1e40af",
    accentColor: "#10b981",
  },
  features: {
    onlineScheduling: true,
    telehealth: false,
    prescriptionRefills: true,
    labResults: true,
    messaging: true,
    billing: false,
    patientPortal: true,
    mobileApp: false,
  },
  subscription: {
    plan: "demo",
    status: "active",
    maxUsers: 10,
    maxPatients: 100,
  },
  contactInfo: {
    phone: "",
    email: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "US",
    },
  },
};

export function TenantSettings({ className }: TenantSettingsProps) {
  const [settings, setSettings] = useState<TenantSettingsData>(DEFAULT_TENANT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<TenantSettingsData>(DEFAULT_TENANT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadTenantSettings();
  }, []);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const loadTenantSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/tenant-settings");
      if (!response.ok) {
        throw new Error("Failed to load tenant settings");
      }

      const data = await response.json();
      if (data.success && data.data) {
        // Extract only the fields we manage in this component
        const loadedSettings: TenantSettingsData = {
          branding: data.data.branding || DEFAULT_TENANT_SETTINGS.branding,
          features: data.data.features || DEFAULT_TENANT_SETTINGS.features,
          subscription: data.data.subscription || DEFAULT_TENANT_SETTINGS.subscription,
          contactInfo: data.data.contactInfo || DEFAULT_TENANT_SETTINGS.contactInfo,
        };
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load tenant settings"
      );
      // Use defaults if API fails
      setSettings(DEFAULT_TENANT_SETTINGS);
      setOriginalSettings(DEFAULT_TENANT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const validationErrors = validateSettings();
      if (validationErrors.length > 0) {
        setError(validationErrors.join(", "));
        setIsSaving(false);
        return;
      }

      // Don't send subscription data - it's read-only for tenant admins
      const { subscription, ...settingsToSave } = settings;
      
      const response = await fetch("/api/admin/tenant-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settingsToSave),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save tenant settings");
      }

      const data = await response.json();
      if (data.success) {
        setOriginalSettings(settings);
        setSuccess("Tenant settings saved successfully");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save tenant settings"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSettings(originalSettings);
    setError(null);
    setSuccess(null);
  };

  const validateSettings = (): string[] => {
    const errors: string[] = [];

    if (!settings.contactInfo.email.trim()) {
      errors.push("Contact email is required");
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(settings.contactInfo.email)) {
        errors.push("Invalid contact email format");
      }
    }

    if (!settings.contactInfo.phone.trim()) {
      errors.push("Contact phone is required");
    }

    if (!settings.contactInfo.address.street.trim()) {
      errors.push("Street address is required");
    }

    if (!settings.contactInfo.address.city.trim()) {
      errors.push("City is required");
    }

    if (!settings.contactInfo.address.state.trim()) {
      errors.push("State is required");
    }

    if (!settings.contactInfo.address.zipCode.trim()) {
      errors.push("ZIP code is required");
    }

    // Validate color formats
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!colorRegex.test(settings.branding.primaryColor)) {
      errors.push("Primary color must be a valid hex color (e.g., #FF0000)");
    }
    if (!colorRegex.test(settings.branding.secondaryColor)) {
      errors.push("Secondary color must be a valid hex color (e.g., #FF0000)");
    }
    if (settings.branding.accentColor && !colorRegex.test(settings.branding.accentColor)) {
      errors.push("Accent color must be a valid hex color (e.g., #FF0000)");
    }

    // Subscription validation removed - subscription is read-only for tenant admins

    // Validate custom domain format if provided
    if (settings.branding.customDomain) {
      const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
      if (!domainRegex.test(settings.branding.customDomain)) {
        errors.push("Custom domain must be a valid domain name");
      }
    }

    return errors;
  };

  const handleInputChange = (
    field: keyof TenantSettingsData,
    value: any
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleNestedInputChange = (
    parentField: keyof TenantSettingsData,
    field: string,
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      [parentField]: {
        ...(prev[parentField] as any),
        [field]: value,
      },
    }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleDeepNestedInputChange = (
    parentField: keyof TenantSettingsData,
    nestedField: string,
    field: string,
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      [parentField]: {
        ...(prev[parentField] as any),
        [nestedField]: {
          ...((prev[parentField] as any)[nestedField] || {}),
          [field]: value,
        },
      },
    }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Tenant Settings
          </CardTitle>
          <CardDescription>Manage tenant-specific configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Tenant Settings
            </CardTitle>
            <CardDescription>
              Manage tenant branding, features, and contact information
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={!hasChanges || isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {(error || success) && (
          <Alert
            className={`mb-4 ${
              error
                ? "border-status-error bg-status-error/10"
                : "border-status-success bg-status-success/10"
            }`}
          >
            {error ? (
              <AlertCircle className="h-4 w-4 text-status-error" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-status-success" />
            )}
            <AlertDescription>
              {error || success}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="branding">
              <Palette className="h-4 w-4 mr-2" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="features">
              <Zap className="h-4 w-4 mr-2" />
              Features
            </TabsTrigger>
            <TabsTrigger value="contact">
              <Phone className="h-4 w-4 mr-2" />
              Contact
            </TabsTrigger>
          </TabsList>

          {/* Branding Settings */}
          <TabsContent value="branding" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="logo"
                    type="url"
                    value={settings.branding.logo || ""}
                    onChange={(e) =>
                      handleNestedInputChange("branding", "logo", e.target.value)
                    }
                    placeholder="https://example.com/logo.png"
                  />
                  <Button variant="outline" type="button">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
                <p className="text-sm text-text-secondary">
                  URL or path to tenant logo image
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">
                  Primary Color <span className="text-status-error">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="text"
                    value={settings.branding.primaryColor}
                    onChange={(e) =>
                      handleNestedInputChange("branding", "primaryColor", e.target.value)
                    }
                    placeholder="#2563eb"
                    pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                  />
                  <div
                    className="w-12 h-10 rounded border border-border-primary"
                    style={{ backgroundColor: settings.branding.primaryColor }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">
                  Secondary Color <span className="text-status-error">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="text"
                    value={settings.branding.secondaryColor}
                    onChange={(e) =>
                      handleNestedInputChange("branding", "secondaryColor", e.target.value)
                    }
                    placeholder="#1e40af"
                    pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                  />
                  <div
                    className="w-12 h-10 rounded border border-border-primary"
                    style={{ backgroundColor: settings.branding.secondaryColor }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="text"
                    value={settings.branding.accentColor || ""}
                    onChange={(e) =>
                      handleNestedInputChange("branding", "accentColor", e.target.value)
                    }
                    placeholder="#10b981"
                    pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                  />
                  {settings.branding.accentColor && (
                    <div
                      className="w-12 h-10 rounded border border-border-primary"
                      style={{ backgroundColor: settings.branding.accentColor }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customDomain">Custom Domain</Label>
                <Input
                  id="customDomain"
                  type="text"
                  value={settings.branding.customDomain || ""}
                  onChange={(e) =>
                    handleNestedInputChange("branding", "customDomain", e.target.value)
                  }
                  placeholder="clinic.example.com"
                />
                <p className="text-sm text-text-secondary">
                  Custom domain for tenant portal (e.g., clinic.example.com)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="favicon">Favicon URL</Label>
                <Input
                  id="favicon"
                  type="url"
                  value={settings.branding.favicon || ""}
                  onChange={(e) =>
                    handleNestedInputChange("branding", "favicon", e.target.value)
                  }
                  placeholder="https://example.com/favicon.ico"
                />
              </div>
            </div>
          </TabsContent>

          {/* Features Settings */}
          <TabsContent value="features" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Feature Flags</h3>
              <p className="text-sm text-text-secondary mb-4">
                Enable or disable features for this tenant
              </p>

              <div className="space-y-4">
                {Object.entries(settings.features).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor={`feature-${key}`}>
                        {key
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (str) => str.toUpperCase())}
                      </Label>
                      <p className="text-sm text-text-secondary">
                        {getFeatureDescription(key)}
                      </p>
                    </div>
                    <Switch
                      id={`feature-${key}`}
                      checked={value}
                      onCheckedChange={(checked) =>
                        handleNestedInputChange("features", key, checked)
                      }
                      aria-label={`Toggle ${key} feature`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Subscription Info (Read-only) */}
          <div className="mt-6 p-4 bg-surface-elevated rounded-lg border border-border-primary">
            <h3 className="text-lg font-semibold mb-4">Subscription Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-secondary">Plan:</span>
                <span className="font-medium capitalize">{settings.subscription.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Status:</span>
                <span className="font-medium capitalize">{settings.subscription.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Max Users:</span>
                <span className="font-medium">{settings.subscription.maxUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Max Patients:</span>
                <span className="font-medium">{settings.subscription.maxPatients}</span>
              </div>
            </div>
            <Alert className="mt-4 border-border-primary bg-surface-elevated">
              <AlertCircle className="h-4 w-4 text-text-secondary" />
              <AlertDescription className="text-text-secondary">
                To change your subscription plan or limits, please contact support.
              </AlertDescription>
            </Alert>
          </div>

          {/* Contact Information */}
          <TabsContent value="contact" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-status-error">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.contactInfo.email}
                  onChange={(e) =>
                    handleNestedInputChange("contactInfo", "email", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone <span className="text-status-error">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={settings.contactInfo.phone}
                  onChange={(e) =>
                    handleNestedInputChange("contactInfo", "phone", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={settings.contactInfo.website || ""}
                  onChange={(e) =>
                    handleNestedInputChange("contactInfo", "website", e.target.value)
                  }
                  placeholder="https://example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="street">
                  Street Address <span className="text-status-error">*</span>
                </Label>
                <Input
                  id="street"
                  type="text"
                  value={settings.contactInfo.address.street}
                  onChange={(e) =>
                    handleDeepNestedInputChange("contactInfo", "address", "street", e.target.value)
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">
                    City <span className="text-status-error">*</span>
                  </Label>
                  <Input
                    id="city"
                    type="text"
                    value={settings.contactInfo.address.city}
                    onChange={(e) =>
                      handleDeepNestedInputChange("contactInfo", "address", "city", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">
                    State <span className="text-status-error">*</span>
                  </Label>
                  <Input
                    id="state"
                    type="text"
                    value={settings.contactInfo.address.state}
                    onChange={(e) =>
                      handleDeepNestedInputChange("contactInfo", "address", "state", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zipCode">
                    ZIP Code <span className="text-status-error">*</span>
                  </Label>
                  <Input
                    id="zipCode"
                    type="text"
                    value={settings.contactInfo.address.zipCode}
                    onChange={(e) =>
                      handleDeepNestedInputChange("contactInfo", "address", "zipCode", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">
                    Country <span className="text-status-error">*</span>
                  </Label>
                  <Input
                    id="country"
                    type="text"
                    value={settings.contactInfo.address.country}
                    onChange={(e) =>
                      handleDeepNestedInputChange("contactInfo", "address", "country", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function getFeatureDescription(key: string): string {
  const descriptions: Record<string, string> = {
    onlineScheduling: "Allow patients to schedule appointments online",
    telehealth: "Enable video consultations and telehealth features",
    prescriptionRefills: "Enable prescription refill requests",
    labResults: "Allow viewing and sharing of lab results",
    messaging: "Enable secure messaging between patients and providers",
    billing: "Enable billing and payment processing",
    patientPortal: "Enable patient portal access",
    mobileApp: "Enable mobile app access",
  };
  return descriptions[key] || "";
}

