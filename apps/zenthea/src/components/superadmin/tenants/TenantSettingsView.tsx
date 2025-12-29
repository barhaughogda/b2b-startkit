"use client";

import React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
} from "lucide-react";

interface TenantSettingsViewProps {
  tenantId: string;
  tenantName: string;
  className?: string;
}

interface TenantSettingsData {
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    customDomain?: string;
    favicon?: string;
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
  subscription: {
    plan: "demo" | "basic" | "premium" | "enterprise";
    status: "active" | "cancelled" | "expired";
    maxUsers: number;
    maxPatients: number;
  };
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

/**
 * Calculate configuration completeness percentage
 */
function calculateCompleteness(settings: TenantSettingsData): number {
  let completed = 0;
  let total = 0;

  // Branding (30% weight)
  total += 5;
  if (settings.branding.primaryColor && settings.branding.primaryColor !== "#2563eb") completed += 1;
  if (settings.branding.secondaryColor && settings.branding.secondaryColor !== "#1e40af") completed += 1;
  if (settings.branding.logo) completed += 1;
  if (settings.branding.customDomain) completed += 1;
  if (settings.branding.favicon) completed += 1;

  // Contact Info (40% weight)
  total += 4;
  if (settings.contactInfo.email) completed += 1;
  if (settings.contactInfo.phone) completed += 1;
  if (settings.contactInfo.address.street && settings.contactInfo.address.city) completed += 1;
  if (settings.contactInfo.website) completed += 1;

  // Features (20% weight) - at least 3 features enabled
  total += 1;
  const enabledFeatures = Object.values(settings.features).filter(Boolean).length;
  if (enabledFeatures >= 3) completed += 1;

  // Subscription (10% weight) - plan is set
  total += 1;
  if (settings.subscription.plan && settings.subscription.plan !== "demo") completed += 1;

  return Math.round((completed / total) * 100);
}

export function TenantSettingsView({
  tenantId,
  tenantName,
  className,
}: TenantSettingsViewProps) {
  const [settings, setSettings] = useState<TenantSettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [tenantId]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/superadmin/tenants/${tenantId}`);
      if (!response.ok) {
        throw new Error("Failed to load tenant settings");
      }

      const data = await response.json();
      if (data.success && data.data) {
        setSettings({
          branding: data.data.branding || {},
          features: data.data.features || {},
          subscription: data.data.subscription || {},
          contactInfo: data.data.contactInfo || {},
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load tenant settings"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const completeness = settings ? calculateCompleteness(settings) : 0;
  const getCompletenessColor = () => {
    if (completeness >= 80) return "text-status-success";
    if (completeness >= 50) return "text-status-warning";
    return "text-status-error";
  };

  const getCompletenessBadge = () => {
    if (completeness >= 80) return "default";
    if (completeness >= 50) return "secondary";
    return "destructive";
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Tenant Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Tenant Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-status-error bg-status-error/10">
            <AlertCircle className="h-4 w-4 text-status-error" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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
              Tenant Settings
            </CardTitle>
            <CardDescription>
              View and help configure settings for {tenantName}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getCompletenessBadge()}>
              {completeness}% Complete
            </Badge>
            {completeness < 80 && (
              <Badge variant="outline" className="text-status-warning">
                Needs Setup
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuration Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">
              Configuration Status
            </span>
            <span className={`text-sm font-bold ${getCompletenessColor()}`}>
              {completeness}%
            </span>
          </div>
          <div className="w-full bg-surface-elevated rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                completeness >= 80
                  ? "bg-status-success"
                  : completeness >= 50
                  ? "bg-status-warning"
                  : "bg-status-error"
              }`}
              style={{ width: `${completeness}%` }}
            />
          </div>
          {completeness < 80 && (
            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertDescription>
                This tenant's configuration is incomplete. Use "Help Configure"
                to assist with setup.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Quick View */}
        {settings && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-text-secondary">Branding:</span>
              <p className="font-medium">
                {settings.branding.logo ? "Logo set" : "No logo"}
                {settings.branding.customDomain && ` • ${settings.branding.customDomain}`}
              </p>
            </div>
            <div>
              <span className="text-sm text-text-secondary">Contact:</span>
              <p className="font-medium">
                {settings.contactInfo.email || "No email"}
                {settings.contactInfo.phone && ` • ${settings.contactInfo.phone}`}
              </p>
            </div>
            <div>
              <span className="text-sm text-text-secondary">Features Enabled:</span>
              <p className="font-medium">
                {Object.values(settings.features).filter(Boolean).length} of{" "}
                {Object.keys(settings.features).length}
              </p>
            </div>
            <div>
              <span className="text-sm text-text-secondary">Plan:</span>
              <p className="font-medium capitalize">
                {settings.subscription.plan || "Not set"}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-border-primary">
          <Button
            variant="default"
            data-testid="help-configure-button"
            onClick={() => {
              // Navigate to tenant details page with configuration wizard
              window.location.href = `/superadmin/tenants/${tenantId}?configure=true`;
            }}
            className="flex-1"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Help Configure
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              // Note: This would require tenant context switching in a real implementation
              // For now, just show a message
              alert(`To configure as tenant admin, you would need to switch tenant context to ${tenantId}`);
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View as Tenant Admin
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

