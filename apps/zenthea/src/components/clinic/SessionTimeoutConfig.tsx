"use client";

import { useState, useEffect } from "react";
import { useZentheaSession } from "@/hooks/useZentheaSession";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { isOwner } from "@/lib/auth-utils";

interface SessionTimeoutConfig {
  timeout: number; // in minutes
  warningTime: number; // in minutes
  enabled: boolean;
}

export function SessionTimeoutConfig() {
  const { data: session } = useZentheaSession();
  const [config, setConfig] = useState<SessionTimeoutConfig>({
    timeout: 30,
    warningTime: 2,
    enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isOwnerUser = session?.user && isOwner(session.user);

  // Load current configuration
  useEffect(() => {
    if (!session?.user?.tenantId) return;

    const loadConfig = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/company/settings/session-timeout?tenantId=${session.user.tenantId}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.config) {
            setConfig(data.config);
          }
        } else {
          // Use defaults if API fails
          console.warn("Failed to load session timeout config, using defaults");
        }
      } catch (error) {
        console.error("Error loading session timeout config:", error);
        // Use defaults on error
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [session?.user?.tenantId]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (config.timeout < 5 || config.timeout > 480) {
      newErrors.timeout = "Session timeout must be between 5 and 480 minutes";
    }

    if (config.warningTime < 1) {
      newErrors.warningTime = "Warning time must be at least 1 minute";
    }

    if (config.warningTime >= config.timeout) {
      newErrors.warningTime = "Warning time must be less than session timeout";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Please fix validation errors");
      return;
    }

    if (!session?.user?.tenantId) {
      toast.error("Tenant ID not found");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/company/settings/session-timeout", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeout: config.timeout,
          warningTime: config.warningTime,
          enabled: config.enabled,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success("Session timeout settings updated successfully");
        setErrors({});
      } else {
        const errorMessage =
          data.message || data.error || "Failed to update session timeout settings";
        toast.error(errorMessage);
        if (data.code === "VALIDATION_ERROR" || data.code === "INVALID_TIMEOUT") {
          // Set validation errors
          if (errorMessage.includes("timeout")) {
            setErrors((prev) => ({ ...prev, timeout: errorMessage }));
          } else if (errorMessage.includes("warning")) {
            setErrors((prev) => ({ ...prev, warningTime: errorMessage }));
          }
        }
      }
    } catch (error) {
      console.error("Error updating session timeout config:", error);
      toast.error("Failed to update session timeout settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Timeout Configuration
          </CardTitle>
          <CardDescription>
            Configure automatic logout after inactivity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isOwnerUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Timeout Configuration
          </CardTitle>
          <CardDescription>
            Configure automatic logout after inactivity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Only clinic owners can configure session timeout settings.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Session Timeout Configuration
        </CardTitle>
        <CardDescription>
          Configure automatic logout after inactivity. Users will be logged out
          after the specified period of inactivity.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Enable/Disable Switch */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Enable Session Timeout</Label>
              <p className="text-sm text-text-secondary">
                When enabled, users will be automatically logged out after
                inactivity
              </p>
            </div>
            <Switch
              id="enabled"
              checked={config.enabled}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({ ...prev, enabled: checked }))
              }
              disabled={saving}
            />
          </div>

          {config.enabled && (
            <>
              {/* Timeout Field */}
              <div className="space-y-2">
                <Label htmlFor="timeout">
                  Session Timeout (minutes){" "}
                  <span className="text-status-error">*</span>
                </Label>
                <Input
                  id="timeout"
                  type="number"
                  min={5}
                  max={480}
                  value={config.timeout}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 30;
                    // Auto-adjust warning time if it exceeds timeout
                    setConfig((prev) => {
                      const newTimeout = value;
                      const newWarningTime = prev.warningTime >= newTimeout
                        ? Math.max(1, Math.floor(newTimeout * 0.1))
                        : prev.warningTime;
                      return {
                        ...prev,
                        timeout: newTimeout,
                        warningTime: newWarningTime,
                      };
                    });
                  }}
                  className={errors.timeout ? "border-status-error" : ""}
                  disabled={saving}
                />
                {errors.timeout && (
                  <p className="text-sm text-status-error">{errors.timeout}</p>
                )}
                <p className="text-xs text-text-secondary">
                  Time before automatic logout (5-480 minutes). Recommended: 30
                  minutes for HIPAA compliance.
                </p>
              </div>

              {/* Warning Time Field */}
              <div className="space-y-2">
                <Label htmlFor="warningTime">
                  Warning Time (minutes){" "}
                  <span className="text-status-error">*</span>
                </Label>
                <Input
                  id="warningTime"
                  type="number"
                  min={1}
                  max={config.timeout - 1}
                  value={config.warningTime}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 2;
                    setConfig((prev) => ({
                      ...prev,
                      warningTime: Math.min(value, prev.timeout - 1),
                    }));
                  }}
                  className={errors.warningTime ? "border-status-error" : ""}
                  disabled={saving}
                />
                {errors.warningTime && (
                  <p className="text-sm text-status-error">
                    {errors.warningTime}
                  </p>
                )}
                <p className="text-xs text-text-secondary">
                  Time before logout to show warning (must be less than session
                  timeout). Recommended: 2 minutes.
                </p>
              </div>

              {/* Info Alert */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Users will see a warning {config.warningTime} minute
                  {config.warningTime !== 1 ? "s" : ""} before being logged out
                  after {config.timeout} minute{config.timeout !== 1 ? "s" : ""}{" "}
                  of inactivity.
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-2">
            <Button
              type="submit"
              disabled={saving || !config.enabled}
              className="min-w-[120px]"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


