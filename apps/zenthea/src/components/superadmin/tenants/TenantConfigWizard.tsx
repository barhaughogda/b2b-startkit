"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Palette,
  Zap,
  CreditCard,
  Check,
} from "lucide-react";

interface TenantConfigWizardProps {
  tenantId: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

type WizardStep = "basic" | "branding" | "features" | "preferences" | "review";

interface WizardData {
  // Basic Information
  name: string;
  type: "clinic" | "hospital" | "practice" | "group";
  email: string;
  phone: string;

  // Branding
  primaryColor: string;
  secondaryColor: string;
  logo?: string;
  customDomain?: string;

  // Features
  onlineScheduling: boolean;
  telehealth: boolean;
  prescriptionRefills: boolean;
  labResults: boolean;
  messaging: boolean;
  billing: boolean;
  patientPortal: boolean;
  mobileApp: boolean;

  // Preferences
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  language: string;
}

const STEPS: { id: WizardStep; title: string; description: string }[] = [
  {
    id: "basic",
    title: "Basic Information",
    description: "Enter tenant name, type, and contact information",
  },
  {
    id: "branding",
    title: "Branding",
    description: "Configure colors, logo, and domain",
  },
  {
    id: "features",
    title: "Features",
    description: "Enable features for this tenant",
  },
  {
    id: "preferences",
    title: "Preferences",
    description: "Set timezone, date format, and other preferences",
  },
  {
    id: "review",
    title: "Review & Apply",
    description: "Review all settings before applying",
  },
];

const DEFAULT_DATA: WizardData = {
  name: "",
  type: "clinic",
  email: "",
  phone: "",
  primaryColor: "#2563eb",
  secondaryColor: "#1e40af",
  onlineScheduling: true,
  telehealth: false,
  prescriptionRefills: true,
  labResults: true,
  messaging: true,
  billing: false,
  patientPortal: true,
  mobileApp: false,
  timezone: "America/New_York",
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  currency: "USD",
  language: "en",
};

export function TenantConfigWizard({
  tenantId,
  onComplete,
  onCancel,
}: TenantConfigWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>("basic");
  const [data, setData] = useState<WizardData>(DEFAULT_DATA);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1].id as WizardStep);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id as WizardStep);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Update tenant with all configuration data
      const response = await fetch(`/api/superadmin/tenants/${tenantId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          type: data.type,
          contactInfo: {
            email: data.email,
            phone: data.phone,
          },
          branding: {
            primaryColor: data.primaryColor,
            secondaryColor: data.secondaryColor,
            logo: data.logo,
            customDomain: data.customDomain,
          },
          features: {
            onlineScheduling: data.onlineScheduling,
            telehealth: data.telehealth,
            prescriptionRefills: data.prescriptionRefills,
            labResults: data.labResults,
            messaging: data.messaging,
            billing: data.billing,
            patientPortal: data.patientPortal,
            mobileApp: data.mobileApp,
          },
          systemSettings: {
            timezone: data.timezone,
            dateFormat: data.dateFormat,
            timeFormat: data.timeFormat,
            currency: data.currency,
            language: data.language,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save tenant configuration");
      }

      onComplete?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save configuration"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "basic":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tenant Name *</Label>
              <Input
                id="name"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                placeholder="Acme Medical Clinic"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tenant Type *</Label>
              <Select
                value={data.type}
                onValueChange={(value: any) =>
                  setData({ ...data, type: value })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="practice">Practice</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Contact Email *</Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                placeholder="contact@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Contact Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={data.phone}
                onChange={(e) => setData({ ...data, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        );

      case "branding":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={data.primaryColor}
                    onChange={(e) =>
                      setData({ ...data, primaryColor: e.target.value })
                    }
                    className="h-10 w-20"
                  />
                  <Input
                    value={data.primaryColor}
                    onChange={(e) =>
                      setData({ ...data, primaryColor: e.target.value })
                    }
                    placeholder="#2563eb"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={data.secondaryColor}
                    onChange={(e) =>
                      setData({ ...data, secondaryColor: e.target.value })
                    }
                    className="h-10 w-20"
                  />
                  <Input
                    value={data.secondaryColor}
                    onChange={(e) =>
                      setData({ ...data, secondaryColor: e.target.value })
                    }
                    placeholder="#1e40af"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customDomain">Custom Domain (optional)</Label>
              <Input
                id="customDomain"
                value={data.customDomain || ""}
                onChange={(e) =>
                  setData({ ...data, customDomain: e.target.value })
                }
                placeholder="clinic.example.com"
              />
            </div>
            <Alert>
              <AlertDescription>
                Logo upload will be available after initial setup. You can
                configure it in tenant settings.
              </AlertDescription>
            </Alert>
          </div>
        );

      case "features":
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                { key: "onlineScheduling", label: "Online Scheduling" },
                { key: "telehealth", label: "Telehealth" },
                { key: "prescriptionRefills", label: "Prescription Refills" },
                { key: "labResults", label: "Lab Results" },
                { key: "messaging", label: "Messaging" },
                { key: "billing", label: "Billing" },
                { key: "patientPortal", label: "Patient Portal" },
                { key: "mobileApp", label: "Mobile App" },
              ].map((feature) => (
                <div
                  key={feature.key}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <Label htmlFor={feature.key} className="cursor-pointer">
                    {feature.label}
                  </Label>
                  <Switch
                    id={feature.key}
                    checked={data[feature.key as keyof WizardData] as boolean}
                    onCheckedChange={(checked) =>
                      setData({ ...data, [feature.key]: checked })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case "preferences":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={data.timezone}
                onValueChange={(value) =>
                  setData({ ...data, timezone: value })
                }
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Chicago">Central Time</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">
                    Pacific Time
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select
                  value={data.dateFormat}
                  onValueChange={(value) =>
                    setData({ ...data, dateFormat: value })
                  }
                >
                  <SelectTrigger id="dateFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeFormat">Time Format</Label>
                <Select
                  value={data.timeFormat}
                  onValueChange={(value) =>
                    setData({ ...data, timeFormat: value })
                  }
                >
                  <SelectTrigger id="timeFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12-hour</SelectItem>
                    <SelectItem value="24h">24-hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={data.currency}
                  onValueChange={(value) =>
                    setData({ ...data, currency: value })
                  }
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={data.language}
                  onValueChange={(value) =>
                    setData({ ...data, language: value })
                  }
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      case "review":
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div>
                  <span className="text-sm text-text-secondary">Name:</span>
                  <p className="font-medium">{data.name}</p>
                </div>
                <div>
                  <span className="text-sm text-text-secondary">Type:</span>
                  <p className="font-medium capitalize">{data.type}</p>
                </div>
                <div>
                  <span className="text-sm text-text-secondary">Email:</span>
                  <p className="font-medium">{data.email}</p>
                </div>
                <div>
                  <span className="text-sm text-text-secondary">Phone:</span>
                  <p className="font-medium">{data.phone || "Not set"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Branding
              </h3>
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div>
                  <span className="text-sm text-text-secondary">Primary Color:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: data.primaryColor }}
                    />
                    <p className="font-medium">{data.primaryColor}</p>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-text-secondary">Secondary Color:</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{ backgroundColor: data.secondaryColor }}
                    />
                    <p className="font-medium">{data.secondaryColor}</p>
                  </div>
                </div>
                {data.customDomain && (
                  <div>
                    <span className="text-sm text-text-secondary">Domain:</span>
                    <p className="font-medium">{data.customDomain}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Features ({[
                  data.onlineScheduling,
                  data.telehealth,
                  data.prescriptionRefills,
                  data.labResults,
                  data.messaging,
                  data.billing,
                  data.patientPortal,
                  data.mobileApp,
                ].filter(Boolean).length} enabled)
              </h3>
              <div className="grid grid-cols-2 gap-2 pl-6">
                {[
                  { key: 'onlineScheduling', value: data.onlineScheduling, label: 'Online Scheduling' },
                  { key: 'telehealth', value: data.telehealth, label: 'Telehealth' },
                  { key: 'prescriptionRefills', value: data.prescriptionRefills, label: 'Prescription Refills' },
                  { key: 'labResults', value: data.labResults, label: 'Lab Results' },
                  { key: 'messaging', value: data.messaging, label: 'Messaging' },
                  { key: 'billing', value: data.billing, label: 'Billing' },
                  { key: 'patientPortal', value: data.patientPortal, label: 'Patient Portal' },
                  { key: 'mobileApp', value: data.mobileApp, label: 'Mobile App' },
                ].map(({ key, value, label }) =>
                  value ? (
                    <div key={key} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-status-success" />
                      <span className="text-sm">{label}</span>
                    </div>
                  ) : null
                )}
              </div>
            </div>

            {error && (
              <Alert className="border-status-error bg-status-error/10">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto" data-testid="config-wizard">
      <CardHeader>
        <CardTitle>Tenant Configuration Wizard</CardTitle>
        <CardDescription>
          Step {currentStepIndex + 1} of {STEPS.length}:{" "}
          {STEPS[currentStepIndex].title}
        </CardDescription>
        <div className="w-full bg-surface-elevated rounded-full h-2 mt-4">
          <div
            className="h-2 rounded-full bg-zenthea-teal transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="min-h-[400px]">{renderStepContent()}</div>

        <div className="flex items-center justify-between pt-4 border-t border-border-primary">
          <div>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <Button variant="outline" onClick={handlePrevious}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
            {currentStepIndex < STEPS.length - 1 ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Apply Configuration
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

