"use client";

import { useState, useEffect } from "react";
import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Building2,
  Settings,
  CreditCard,
  Palette,
  Zap,
  Users,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { TenantSettingsView } from "@/components/superadmin/tenants/TenantSettingsView";

interface TenantDetails {
  _id: string;
  id: string;
  name: string;
  type: string;
  status: string;
  branding: any;
  features: any;
  subscription: any;
  contactInfo: any;
  userCount: number;
  patientCount: number;
  createdAt: number;
  updatedAt: number;
}

export default function SuperAdminTenantDetailsPage() {
  const { data: session, status } = useZentheaSession();
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "super_admin") {
      loadTenantDetails();
    }
  }, [status, session, tenantId]);

  const loadTenantDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/superadmin/tenants/${tenantId}`);
      if (!response.ok) {
        throw new Error("Failed to load tenant details");
      }

      const data = await response.json();
      if (data.success && data.data) {
        setTenant(data.data);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load tenant details"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-text-secondary">Please sign in to access this page.</p>
      </div>
    );
  }

  if (session?.user?.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-text-secondary">Access denied. Superadmin role required.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Alert className="border-status-error bg-status-error/10">
          <AlertCircle className="h-4 w-4 text-status-error" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-text-secondary">Tenant not found</p>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/superadmin/tenants">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenants
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">{tenant.name}</h1>
            <p className="text-text-secondary mt-1">
              Tenant ID: {tenant.id}
            </p>
          </div>
          <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
            {tenant.status}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <Building2 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CreditCard className="h-4 w-4 mr-2" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Palette className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="features">
            <Zap className="h-4 w-4 mr-2" />
            Features
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Name:</span>
                  <span className="font-medium">{tenant.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Type:</span>
                  <span className="font-medium capitalize">{tenant.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Status:</span>
                  <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
                    {tenant.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Created:</span>
                  <span className="font-medium">{formatDate(tenant.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Last Updated:</span>
                  <span className="font-medium">{formatDate(tenant.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Users:</span>
                  <span className="font-medium">
                    {tenant.userCount} / {tenant.subscription?.maxUsers || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Patients:</span>
                  <span className="font-medium">
                    {tenant.patientCount} / {tenant.subscription?.maxPatients || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Plan:</span>
                  <Badge variant="outline" className="capitalize">
                    {tenant.subscription?.plan || "N/A"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-text-secondary">Email:</span>
                    <p className="font-medium">{tenant.contactInfo?.email || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Phone:</span>
                    <p className="font-medium">{tenant.contactInfo?.phone || "N/A"}</p>
                  </div>
                  {tenant.contactInfo?.address && (
                    <div className="md:col-span-2">
                      <span className="text-text-secondary">Address:</span>
                      <p className="font-medium">
                        {[
                          tenant.contactInfo.address.street,
                          tenant.contactInfo.address.city,
                          tenant.contactInfo.address.state,
                          tenant.contactInfo.address.zipCode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6 mt-6">
          <TenantSettingsView
            tenantId={tenantId}
            tenantName={tenant.name}
          />
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Management</CardTitle>
              <CardDescription>
                Manage tenant subscription plan, status, and limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-text-secondary">Plan:</span>
                  <p className="font-medium capitalize">{tenant.subscription?.plan || "N/A"}</p>
                </div>
                <div>
                  <span className="text-text-secondary">Status:</span>
                  <p className="font-medium capitalize">{tenant.subscription?.status || "N/A"}</p>
                </div>
                <div>
                  <span className="text-text-secondary">Max Users:</span>
                  <p className="font-medium">{tenant.subscription?.maxUsers || "N/A"}</p>
                </div>
                <div>
                  <span className="text-text-secondary">Max Patients:</span>
                  <p className="font-medium">{tenant.subscription?.maxPatients || "N/A"}</p>
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Subscription management interface coming soon. Use the API to update subscription details.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Branding Settings</CardTitle>
              <CardDescription>
                View tenant branding configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-text-secondary">Primary Color:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: tenant.branding?.primaryColor || "#000000" }}
                    />
                    <span className="font-medium">{tenant.branding?.primaryColor || "N/A"}</span>
                  </div>
                </div>
                <div>
                  <span className="text-text-secondary">Secondary Color:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: tenant.branding?.secondaryColor || "#000000" }}
                    />
                    <span className="font-medium">{tenant.branding?.secondaryColor || "N/A"}</span>
                  </div>
                </div>
                <div>
                  <span className="text-text-secondary">Custom Domain:</span>
                  <p className="font-medium">{tenant.branding?.customDomain || "N/A"}</p>
                </div>
                <div>
                  <span className="text-text-secondary">Logo:</span>
                  <p className="font-medium">{tenant.branding?.logo ? "Set" : "Not set"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                View enabled features for this tenant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tenant.features &&
                  Object.entries(tenant.features).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-text-secondary capitalize">
                        {key.replace(/([A-Z])/g, " $1").trim()}:
                      </span>
                      <Badge variant={value ? "default" : "secondary"}>
                        {value ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                View tenant activity and audit logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary">
                Activity log interface coming soon. Audit logs are being tracked in the database.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

