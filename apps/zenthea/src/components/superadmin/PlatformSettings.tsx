"use client";

import { useState, useEffect } from "react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
  Shield,
  Plug,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface PlatformSettingsData {
  // Security Policies
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  requireMFA: boolean;
  sessionTimeout: number;
  accountLockoutMaxAttempts: number;
  accountLockoutDuration: number;

  // Platform Integrations
  apiKeys: {
    name: string;
    key: string;
    createdAt?: string;
  }[];
  webhooks: {
    url: string;
    events: string[];
    active: boolean;
  }[];

  // Default Tenant Settings
  defaultTenantSettings: {
    branding: {
      primaryColor: string;
      secondaryColor: string;
    };
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
  };
}

interface PlatformSettingsProps {
  className?: string;
}

const DEFAULT_SETTINGS: PlatformSettingsData = {
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecialChars: true,
  requireMFA: true,
  sessionTimeout: 30,
  accountLockoutMaxAttempts: 5,
  accountLockoutDuration: 15,
  apiKeys: [],
  webhooks: [],
  defaultTenantSettings: {
    branding: {
      primaryColor: "#2563eb",
      secondaryColor: "#1e40af",
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
  },
};

export function PlatformSettings({ className }: PlatformSettingsProps) {
  const [settings, setSettings] = useState<PlatformSettingsData>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<PlatformSettingsData>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/superadmin/platform-settings");
      if (!response.ok) {
        throw new Error("Failed to load platform settings");
      }

      const data = await response.json();
      if (data.success && data.data) {
        const loadedSettings = { ...DEFAULT_SETTINGS, ...data.data };
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load platform settings"
      );
      setSettings(DEFAULT_SETTINGS);
      setOriginalSettings(DEFAULT_SETTINGS);
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

      const response = await fetch("/api/superadmin/platform-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save platform settings");
      }

      const data = await response.json();
      if (data.success) {
        setOriginalSettings(settings);
        setSuccess("Platform settings saved successfully");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save platform settings"
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

    if (settings.passwordMinLength < 8 || settings.passwordMinLength > 128) {
      errors.push("Password minimum length must be between 8 and 128 characters");
    }

    if (settings.sessionTimeout < 5 || settings.sessionTimeout > 480) {
      errors.push("Session timeout must be between 5 and 480 minutes");
    }

    if (settings.accountLockoutMaxAttempts < 3 || settings.accountLockoutMaxAttempts > 10) {
      errors.push("Account lockout max attempts must be between 3 and 10");
    }

    if (settings.accountLockoutDuration < 5 || settings.accountLockoutDuration > 1440) {
      errors.push("Account lockout duration must be between 5 and 1440 minutes");
    }

    return errors;
  };

  const handleInputChange = (
    field: keyof PlatformSettingsData,
    value: string | number | boolean
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleNestedInputChange = (
    parentField: keyof PlatformSettingsData,
    field: string,
    value: string | number | boolean
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

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Platform Settings
          </CardTitle>
          <CardDescription>Manage platform-wide configuration</CardDescription>
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
              <Settings className="h-5 w-5" />
              Platform Settings
            </CardTitle>
            <CardDescription>
              Manage platform-wide security policies, integrations, and default settings
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

        <Tabs defaultValue="security" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security Policies
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Plug className="h-4 w-4 mr-2" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="defaults">
              <Settings className="h-4 w-4 mr-2" />
              Defaults
            </TabsTrigger>
          </TabsList>

          {/* Security Policies */}
          <TabsContent value="security" className="space-y-6 mt-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Password Policy</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="passwordMinLength">
                    Minimum Password Length <span className="text-status-error">*</span>
                  </Label>
                  <Input
                    id="passwordMinLength"
                    type="number"
                    min={8}
                    max={128}
                    value={settings.passwordMinLength}
                    onChange={(e) =>
                      handleInputChange("passwordMinLength", parseInt(e.target.value) || 8)
                    }
                  />
                  <p className="text-sm text-text-secondary">
                    Minimum number of characters required (8-128)
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="passwordRequireUppercase">Require Uppercase Letters</Label>
                      <p className="text-sm text-text-secondary">
                        Password must contain uppercase letters
                      </p>
                    </div>
                    <Switch
                      id="passwordRequireUppercase"
                      checked={settings.passwordRequireUppercase}
                      onCheckedChange={(checked) =>
                        handleInputChange("passwordRequireUppercase", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="passwordRequireLowercase">Require Lowercase Letters</Label>
                      <p className="text-sm text-text-secondary">
                        Password must contain lowercase letters
                      </p>
                    </div>
                    <Switch
                      id="passwordRequireLowercase"
                      checked={settings.passwordRequireLowercase}
                      onCheckedChange={(checked) =>
                        handleInputChange("passwordRequireLowercase", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="passwordRequireNumbers">Require Numbers</Label>
                      <p className="text-sm text-text-secondary">
                        Password must contain numbers
                      </p>
                    </div>
                    <Switch
                      id="passwordRequireNumbers"
                      checked={settings.passwordRequireNumbers}
                      onCheckedChange={(checked) =>
                        handleInputChange("passwordRequireNumbers", checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="passwordRequireSpecialChars">Require Special Characters</Label>
                      <p className="text-sm text-text-secondary">
                        Password must contain special characters (!@#$%^&*)
                      </p>
                    </div>
                    <Switch
                      id="passwordRequireSpecialChars"
                      checked={settings.passwordRequireSpecialChars}
                      onCheckedChange={(checked) =>
                        handleInputChange("passwordRequireSpecialChars", checked)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold">Authentication</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="requireMFA">Require Multi-Factor Authentication</Label>
                    <p className="text-sm text-text-secondary">
                      Require MFA for all user logins
                    </p>
                  </div>
                  <Switch
                    id="requireMFA"
                    checked={settings.requireMFA}
                    onCheckedChange={(checked) => handleInputChange("requireMFA", checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">
                    Default Session Timeout (minutes) <span className="text-status-error">*</span>
                  </Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min={5}
                    max={480}
                    value={settings.sessionTimeout}
                    onChange={(e) =>
                      handleInputChange("sessionTimeout", parseInt(e.target.value) || 30)
                    }
                  />
                  <p className="text-sm text-text-secondary">
                    Default session timeout for new tenants (5-480 minutes)
                  </p>
                </div>
              </div>

              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold">Account Lockout</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="accountLockoutMaxAttempts">
                    Max Failed Attempts <span className="text-status-error">*</span>
                  </Label>
                  <Input
                    id="accountLockoutMaxAttempts"
                    type="number"
                    min={3}
                    max={10}
                    value={settings.accountLockoutMaxAttempts}
                    onChange={(e) =>
                      handleInputChange("accountLockoutMaxAttempts", parseInt(e.target.value) || 5)
                    }
                  />
                  <p className="text-sm text-text-secondary">
                    Number of failed login attempts before lockout (3-10)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountLockoutDuration">
                    Lockout Duration (minutes) <span className="text-status-error">*</span>
                  </Label>
                  <Input
                    id="accountLockoutDuration"
                    type="number"
                    min={5}
                    max={1440}
                    value={settings.accountLockoutDuration}
                    onChange={(e) =>
                      handleInputChange("accountLockoutDuration", parseInt(e.target.value) || 15)
                    }
                  />
                  <p className="text-sm text-text-secondary">
                    Duration of account lockout after max attempts (5-1440 minutes)
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations" className="space-y-6 mt-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Platform API Keys</h3>
                    <p className="text-sm text-text-secondary">
                      Manage API keys for platform-level integrations
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Add API Key
                  </Button>
                </div>

                {settings.apiKeys.length === 0 ? (
                  <div className="text-center py-8 text-text-secondary border border-dashed rounded-lg">
                    <Plug className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No API keys configured</p>
                    <p className="text-sm mt-2">
                      Add API keys to enable platform-level integrations
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {settings.apiKeys.map((apiKey, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{apiKey.name}</p>
                            <p className="text-sm text-text-secondary">
                              {apiKey.key.substring(0, 20)}...
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Delete
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Platform Webhooks</h3>
                    <p className="text-sm text-text-secondary">
                      Configure webhooks for platform-level event notifications
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Add Webhook
                  </Button>
                </div>

                {settings.webhooks.length === 0 ? (
                  <div className="text-center py-8 text-text-secondary border border-dashed rounded-lg">
                    <Plug className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No webhooks configured</p>
                    <p className="text-sm mt-2">
                      Add webhooks to receive platform-level event notifications
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {settings.webhooks.map((webhook, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{webhook.url}</p>
                            <p className="text-sm text-text-secondary">
                              Events: {webhook.events.join(", ")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={webhook.active}
                              onCheckedChange={(checked) => {
                                const newWebhooks = [...settings.webhooks];
                                const webhook = newWebhooks[index];
                                if (webhook) {
                                  webhook.active = checked;
                                  setSettings((prev) => ({ ...prev, webhooks: newWebhooks }));
                                }
                                if (error) setError(null);
                                if (success) setSuccess(null);
                              }}
                            />
                            <Button variant="outline" size="sm">
                              Delete
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Defaults */}
          <TabsContent value="defaults" className="space-y-6 mt-6">
            <div className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Default tenant settings are used as templates when creating new tenants.
                  These settings can be customized per tenant after creation.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Default Branding</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultPrimaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="defaultPrimaryColor"
                        type="text"
                        value={settings.defaultTenantSettings.branding.primaryColor}
                        onChange={(e) => {
                          setSettings((prev) => ({
                            ...prev,
                            defaultTenantSettings: {
                              ...prev.defaultTenantSettings,
                              branding: {
                                ...prev.defaultTenantSettings.branding,
                                primaryColor: e.target.value,
                              },
                            },
                          }));
                          if (error) setError(null);
                          if (success) setSuccess(null);
                        }}
                      />
                      <div
                        className="w-12 h-10 rounded border"
                        style={{
                          backgroundColor: settings.defaultTenantSettings.branding.primaryColor,
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultSecondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="defaultSecondaryColor"
                        type="text"
                        value={settings.defaultTenantSettings.branding.secondaryColor}
                        onChange={(e) => {
                          setSettings((prev) => ({
                            ...prev,
                            defaultTenantSettings: {
                              ...prev.defaultTenantSettings,
                              branding: {
                                ...prev.defaultTenantSettings.branding,
                                secondaryColor: e.target.value,
                              },
                            },
                          }));
                          if (error) setError(null);
                          if (success) setSuccess(null);
                        }}
                      />
                      <div
                        className="w-12 h-10 rounded border"
                        style={{
                          backgroundColor: settings.defaultTenantSettings.branding.secondaryColor,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold">Default Features</h3>
                <div className="space-y-4">
                  {Object.entries(settings.defaultTenantSettings.features).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label htmlFor={`default-${key}`}>
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </Label>
                      <Switch
                        id={`default-${key}`}
                        checked={value as boolean}
                        onCheckedChange={(checked) => {
                          setSettings((prev) => ({
                            ...prev,
                            defaultTenantSettings: {
                              ...prev.defaultTenantSettings,
                              features: {
                                ...prev.defaultTenantSettings.features,
                                [key]: checked,
                              },
                            },
                          }));
                          if (error) setError(null);
                          if (success) setSuccess(null);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

