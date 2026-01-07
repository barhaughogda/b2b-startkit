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
  Settings,
  Bell,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface PracticePreferencesData {
  // General Settings
  timezone: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  currency: string;
  language: string;

  // Session Management (tenant-level only)
  sessionTimeout: number; // in minutes
  maxConcurrentSessions: number;

  // Notification Settings
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  emailFromAddress: string;
  smsProvider: string;
}

interface PracticePreferencesProps {
  className?: string;
}

const DEFAULT_SETTINGS: PracticePreferencesData = {
  timezone: "America/New_York",
  dateFormat: "MM/dd/yyyy",
  timeFormat: "12h",
  currency: "USD",
  language: "en",
  sessionTimeout: 30,
  maxConcurrentSessions: 3,
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: false,
  emailFromAddress: "noreply@zenthea.com",
  smsProvider: "twilio",
};

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "America/Honolulu",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

const DATE_FORMATS = [
  "MM/dd/yyyy",
  "dd/MM/yyyy",
  "yyyy-MM-dd",
  "MMM dd, yyyy",
  "dd MMM yyyy",
];

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "CHF",
  "CNY",
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
];

export function PracticePreferences({ className }: PracticePreferencesProps) {
  const [settings, setSettings] = useState<PracticePreferencesData>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<PracticePreferencesData>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/system-settings");
      if (!response.ok) {
        throw new Error("Failed to load settings");
      }

      const data = await response.json();
      if (data.success && data.data) {
        // Extract only tenant-appropriate settings
        const loadedSettings: PracticePreferencesData = {
          timezone: data.data.timezone || DEFAULT_SETTINGS.timezone,
          dateFormat: data.data.dateFormat || DEFAULT_SETTINGS.dateFormat,
          timeFormat: data.data.timeFormat || DEFAULT_SETTINGS.timeFormat,
          currency: data.data.currency || DEFAULT_SETTINGS.currency,
          language: data.data.language || DEFAULT_SETTINGS.language,
          sessionTimeout: data.data.sessionTimeout || DEFAULT_SETTINGS.sessionTimeout,
          maxConcurrentSessions: data.data.maxConcurrentSessions || DEFAULT_SETTINGS.maxConcurrentSessions,
          emailNotifications: data.data.emailNotifications ?? DEFAULT_SETTINGS.emailNotifications,
          smsNotifications: data.data.smsNotifications ?? DEFAULT_SETTINGS.smsNotifications,
          pushNotifications: data.data.pushNotifications ?? DEFAULT_SETTINGS.pushNotifications,
          emailFromAddress: data.data.emailFromAddress || DEFAULT_SETTINGS.emailFromAddress,
          smsProvider: data.data.smsProvider || DEFAULT_SETTINGS.smsProvider,
        };
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load practice preferences"
      );
      // Use defaults if API fails
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

      const response = await fetch("/api/admin/system-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save preferences");
      }

      const data = await response.json();
      if (data.success) {
        setOriginalSettings(settings);
        setSuccess("Practice preferences saved successfully");
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save practice preferences"
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

    if (settings.sessionTimeout < 5 || settings.sessionTimeout > 480) {
      errors.push("Session timeout must be between 5 and 480 minutes");
    }

    if (settings.maxConcurrentSessions < 1 || settings.maxConcurrentSessions > 10) {
      errors.push("Max concurrent sessions must be between 1 and 10");
    }

    if (settings.emailNotifications && !settings.emailFromAddress.trim()) {
      errors.push("Email from address is required when email notifications are enabled");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (settings.emailFromAddress && !emailRegex.test(settings.emailFromAddress)) {
      errors.push("Invalid email from address format");
    }

    return errors;
  };

  const handleInputChange = (
    field: keyof PracticePreferencesData,
    value: string | number | boolean
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Practice Preferences
          </CardTitle>
          <CardDescription>Manage practice preferences and notification settings</CardDescription>
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
              Practice Preferences
            </CardTitle>
            <CardDescription>
              Manage practice preferences and notification settings
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

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">
              <Settings className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <Settings className="h-4 w-4 mr-2" />
              Sessions
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">
                  Timezone <span className="text-status-error">*</span>
                </Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => handleInputChange("timezone", value)}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFormat">
                  Date Format <span className="text-status-error">*</span>
                </Label>
                <Select
                  value={settings.dateFormat}
                  onValueChange={(value) => handleInputChange("dateFormat", value)}
                >
                  <SelectTrigger id="dateFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map((format) => (
                      <SelectItem key={format} value={format}>
                        {format}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeFormat">
                  Time Format <span className="text-status-error">*</span>
                </Label>
                <Select
                  value={settings.timeFormat}
                  onValueChange={(value) =>
                    handleInputChange("timeFormat", value as "12h" | "24h")
                  }
                >
                  <SelectTrigger id="timeFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                    <SelectItem value="24h">24-hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">
                  Currency <span className="text-status-error">*</span>
                </Label>
                <Select
                  value={settings.currency}
                  onValueChange={(value) => handleInputChange("currency", value)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr} value={curr}>
                        {curr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">
                  Language <span className="text-status-error">*</span>
                </Label>
                <Select
                  value={settings.language}
                  onValueChange={(value) => handleInputChange("language", value)}
                >
                  <SelectTrigger id="language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Session Management */}
          <TabsContent value="sessions" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Session Management</h3>
              
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">
                  Session Timeout (minutes) <span className="text-status-error">*</span>
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
                  Session will expire after this many minutes of inactivity (5-480 minutes)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxConcurrentSessions">
                  Max Concurrent Sessions <span className="text-status-error">*</span>
                </Label>
                <Input
                  id="maxConcurrentSessions"
                  type="number"
                  min={1}
                  max={10}
                  value={settings.maxConcurrentSessions}
                  onChange={(e) =>
                    handleInputChange("maxConcurrentSessions", parseInt(e.target.value) || 3)
                  }
                />
                <p className="text-sm text-text-secondary">
                  Maximum number of concurrent sessions per user (1-10)
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6 mt-6">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Notification Channels</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-text-secondary">
                      Enable email notifications for system events
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => handleInputChange("emailNotifications", checked)}
                    aria-label="Email Notifications"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="smsNotifications">SMS Notifications</Label>
                    <p className="text-sm text-text-secondary">
                      Enable SMS notifications for critical alerts
                    </p>
                  </div>
                  <Switch
                    id="smsNotifications"
                    checked={settings.smsNotifications}
                    onCheckedChange={(checked) => handleInputChange("smsNotifications", checked)}
                    aria-label="SMS Notifications"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pushNotifications">Push Notifications</Label>
                    <p className="text-sm text-text-secondary">
                      Enable push notifications for mobile apps
                    </p>
                  </div>
                  <Switch
                    id="pushNotifications"
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => handleInputChange("pushNotifications", checked)}
                    aria-label="Push Notifications"
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold">Notification Configuration</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="emailFromAddress">
                    Email From Address <span className="text-status-error">*</span>
                  </Label>
                  <Input
                    id="emailFromAddress"
                    type="email"
                    value={settings.emailFromAddress}
                    onChange={(e) => handleInputChange("emailFromAddress", e.target.value)}
                    placeholder="noreply@zenthea.com"
                  />
                  <p className="text-sm text-text-secondary">
                    Email address used as sender for system notifications
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smsProvider">
                    SMS Provider <span className="text-status-error">*</span>
                  </Label>
                  <Select
                    value={settings.smsProvider}
                    onValueChange={(value) => handleInputChange("smsProvider", value)}
                  >
                    <SelectTrigger id="smsProvider">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="aws-sns">AWS SNS</SelectItem>
                      <SelectItem value="vonage">Vonage</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-text-secondary">
                    SMS service provider for sending notifications
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

