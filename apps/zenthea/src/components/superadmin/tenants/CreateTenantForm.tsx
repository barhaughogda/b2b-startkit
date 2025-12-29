"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
} from "lucide-react";
import {
  createTenantSchema,
  type CreateTenantData,
} from "@/lib/schemas/tenant";
import { toast } from "sonner";

interface CreateTenantFormProps {
  onSuccess?: (tenantId: string) => void;
}

export function CreateTenantForm({ onSuccess }: CreateTenantFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [domainAvailable, setDomainAvailable] = useState<boolean | null>(null);
  const [idAvailable, setIdAvailable] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<CreateTenantData>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      type: "clinic",
      contactInfo: {
        address: {
          country: "United States",
        },
      },
      subscription: {
        plan: "demo",
        maxUsers: 10,
        maxPatients: 100,
      },
    },
  });

  const watchedId = watch("id");
  const watchedCustomDomain = watch("branding.customDomain");

  // Check tenant ID availability
  const checkIdAvailability = async (id: string) => {
    if (!id || id.length < 1) {
      setIdAvailable(null);
      return;
    }

    setIsCheckingDomain(true);
    try {
      const response = await fetch(
        `/api/superadmin/tenants/check-domain?id=${encodeURIComponent(id)}`
      );
      const data = await response.json();

      if (data.success && data.data.idAvailable !== undefined) {
        setIdAvailable(data.data.idAvailable);
        if (!data.data.idAvailable) {
          trigger("id");
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error checking ID availability:", error);
      }
    } finally {
      setIsCheckingDomain(false);
    }
  };

  // Check domain availability
  const checkDomainAvailability = async (domain: string) => {
    if (!domain || domain.length < 1) {
      setDomainAvailable(null);
      return;
    }

    setIsCheckingDomain(true);
    try {
      const response = await fetch(
        `/api/superadmin/tenants/check-domain?customDomain=${encodeURIComponent(domain)}`
      );
      const data = await response.json();

      if (data.success && data.data.domainAvailable !== undefined) {
        setDomainAvailable(data.data.domainAvailable);
        if (!data.data.domainAvailable) {
          trigger("branding.customDomain");
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error checking domain availability:", error);
      }
    } finally {
      setIsCheckingDomain(false);
    }
  };

  // Debounced ID check
  const handleIdChange = (value: string) => {
    setValue("id", value);
    if (value) {
      setTimeout(() => checkIdAvailability(value), 500);
    } else {
      setIdAvailable(null);
    }
  };

  // Debounced domain check
  const handleDomainChange = (value: string) => {
    setValue("branding.customDomain", value);
    if (value) {
      setTimeout(() => checkDomainAvailability(value), 500);
    } else {
      setDomainAvailable(null);
    }
  };

  const onSubmit = async (data: CreateTenantData) => {
    setIsSubmitting(true);

    try {
      // Clean up empty optional fields
      const submitData: any = {
        ...data,
        contactInfo: {
          ...data.contactInfo,
          website: data.contactInfo.website || undefined,
        },
        branding: data.branding
          ? {
              ...data.branding,
              logo: data.branding.logo || undefined,
              customDomain: data.branding.customDomain || undefined,
              favicon: data.branding.favicon || undefined,
              customCss: data.branding.customCss || undefined,
            }
          : undefined,
      };

      const response = await fetch("/api/superadmin/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || "Failed to create tenant");
      }

      toast.success("Tenant created successfully", {
        description: `Tenant "${data.name}" has been created.`,
      });

      if (onSuccess) {
        onSuccess(result.data.id);
      } else {
        router.push(`/superadmin/tenants/${result.data.id}`);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error creating tenant:", error);
      }
      toast.error("Failed to create tenant", {
        description:
          error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Create New Tenant
        </CardTitle>
        <CardDescription>
          Create a new tenant organization. All fields marked with * are required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Basic Information</h3>

            {/* Tenant ID */}
            <div className="space-y-2">
              <Label htmlFor="id">
                Tenant ID <span className="text-status-error">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="id"
                  {...register("id")}
                  onChange={(e) => handleIdChange(e.target.value)}
                  placeholder="clinic-123"
                  className={errors.id ? "border-status-error" : ""}
                />
                {isCheckingDomain && watchedId && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-text-secondary" />
                )}
                {!isCheckingDomain && watchedId && idAvailable !== null && (
                  <div className="absolute right-3 top-3">
                    {idAvailable ? (
                      <CheckCircle2 className="h-4 w-4 text-status-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-status-error" />
                    )}
                  </div>
                )}
              </div>
              {errors.id && (
                <p className="text-sm text-status-error">{errors.id.message}</p>
              )}
              {watchedId && idAvailable === false && (
                <p className="text-sm text-status-error">
                  This tenant ID is already in use
                </p>
              )}
              {watchedId && idAvailable === true && (
                <p className="text-sm text-status-success">
                  Tenant ID is available
                </p>
              )}
              <p className="text-xs text-text-secondary">
                Lowercase letters, numbers, and hyphens only (e.g., clinic-123)
              </p>
            </div>

            {/* Tenant Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Tenant Name <span className="text-status-error">*</span>
              </Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Acme Medical Clinic"
                className={errors.name ? "border-status-error" : ""}
              />
              {errors.name && (
                <p className="text-sm text-status-error">{errors.name.message}</p>
              )}
            </div>

            {/* Tenant Type */}
            <div className="space-y-2">
              <Label htmlFor="type">
                Tenant Type <span className="text-status-error">*</span>
              </Label>
              <Select
                value={watch("type")}
                onValueChange={(value) => setValue("type", value as any)}
              >
                <SelectTrigger
                  id="type"
                  className={errors.type ? "border-status-error" : ""}
                >
                  <SelectValue placeholder="Select tenant type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="practice">Practice</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-status-error">{errors.type.message}</p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Contact Information</h3>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-status-error">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...register("contactInfo.email")}
                placeholder="contact@example.com"
                className={errors.contactInfo?.email ? "border-status-error" : ""}
              />
              {errors.contactInfo?.email && (
                <p className="text-sm text-status-error">
                  {errors.contactInfo.email.message}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone <span className="text-status-error">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                {...register("contactInfo.phone")}
                placeholder="+1 (555) 123-4567"
                className={errors.contactInfo?.phone ? "border-status-error" : ""}
              />
              {errors.contactInfo?.phone && (
                <p className="text-sm text-status-error">
                  {errors.contactInfo.phone.message}
                </p>
              )}
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                {...register("contactInfo.website")}
                placeholder="https://www.example.com"
                className={errors.contactInfo?.website ? "border-status-error" : ""}
              />
              {errors.contactInfo?.website && (
                <p className="text-sm text-status-error">
                  {errors.contactInfo.website.message}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="street">
                  Street Address <span className="text-status-error">*</span>
                </Label>
                <Input
                  id="street"
                  {...register("contactInfo.address.street")}
                  placeholder="123 Main St"
                  className={errors.contactInfo?.address?.street ? "border-status-error" : ""}
                />
                {errors.contactInfo?.address?.street && (
                  <p className="text-sm text-status-error">
                    {errors.contactInfo.address.street.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">
                  City <span className="text-status-error">*</span>
                </Label>
                <Input
                  id="city"
                  {...register("contactInfo.address.city")}
                  placeholder="New York"
                  className={errors.contactInfo?.address?.city ? "border-status-error" : ""}
                />
                {errors.contactInfo?.address?.city && (
                  <p className="text-sm text-status-error">
                    {errors.contactInfo.address.city.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">
                  State <span className="text-status-error">*</span>
                </Label>
                <Input
                  id="state"
                  {...register("contactInfo.address.state")}
                  placeholder="NY"
                  className={errors.contactInfo?.address?.state ? "border-status-error" : ""}
                />
                {errors.contactInfo?.address?.state && (
                  <p className="text-sm text-status-error">
                    {errors.contactInfo.address.state.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">
                  Zip Code <span className="text-status-error">*</span>
                </Label>
                <Input
                  id="zipCode"
                  {...register("contactInfo.address.zipCode")}
                  placeholder="10001"
                  className={errors.contactInfo?.address?.zipCode ? "border-status-error" : ""}
                />
                {errors.contactInfo?.address?.zipCode && (
                  <p className="text-sm text-status-error">
                    {errors.contactInfo.address.zipCode.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">
                  Country <span className="text-status-error">*</span>
                </Label>
                <Input
                  id="country"
                  {...register("contactInfo.address.country")}
                  placeholder="United States"
                  className={errors.contactInfo?.address?.country ? "border-status-error" : ""}
                />
                {errors.contactInfo?.address?.country && (
                  <p className="text-sm text-status-error">
                    {errors.contactInfo.address.country.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Subscription</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan">Subscription Plan</Label>
                <Select
                  value={watch("subscription.plan") || "demo"}
                  onValueChange={(value) =>
                    setValue("subscription.plan", value as any)
                  }
                >
                  <SelectTrigger id="plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="demo">Demo</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxUsers">Max Users</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  {...register("subscription.maxUsers", { valueAsNumber: true })}
                  placeholder="10"
                  min={1}
                  max={10000}
                />
                {errors.subscription?.maxUsers && (
                  <p className="text-sm text-status-error">
                    {errors.subscription.maxUsers.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxPatients">Max Patients</Label>
                <Input
                  id="maxPatients"
                  type="number"
                  {...register("subscription.maxPatients", { valueAsNumber: true })}
                  placeholder="100"
                  min={1}
                  max={100000}
                />
                {errors.subscription?.maxPatients && (
                  <p className="text-sm text-status-error">
                    {errors.subscription.maxPatients.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Branding (Optional) */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Branding (Optional)</h3>

            <div className="space-y-2">
              <Label htmlFor="customDomain">Custom Domain</Label>
              <div className="relative">
                <Input
                  id="customDomain"
                  {...register("branding.customDomain")}
                  onChange={(e) => handleDomainChange(e.target.value)}
                  placeholder="clinic.example.com"
                  className={errors.branding?.customDomain ? "border-status-error" : ""}
                />
                {isCheckingDomain && watchedCustomDomain && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-text-secondary" />
                )}
                {!isCheckingDomain && watchedCustomDomain && domainAvailable !== null && (
                  <div className="absolute right-3 top-3">
                    {domainAvailable ? (
                      <CheckCircle2 className="h-4 w-4 text-status-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-status-error" />
                    )}
                  </div>
                )}
              </div>
              {errors.branding?.customDomain && (
                <p className="text-sm text-status-error">
                  {errors.branding.customDomain.message}
                </p>
              )}
              {watchedCustomDomain && domainAvailable === false && (
                <p className="text-sm text-status-error">
                  This domain is already in use
                </p>
              )}
              {watchedCustomDomain && domainAvailable === true && (
                <p className="text-sm text-status-success">Domain is available</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <Input
                  id="primaryColor"
                  type="color"
                  {...register("branding.primaryColor")}
                  className="h-10"
                />
                {errors.branding?.primaryColor && (
                  <p className="text-sm text-status-error">
                    {errors.branding.primaryColor.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <Input
                  id="secondaryColor"
                  type="color"
                  {...register("branding.secondaryColor")}
                  className="h-10"
                />
                {errors.branding?.secondaryColor && (
                  <p className="text-sm text-status-error">
                    {errors.branding.secondaryColor.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <Input
                  id="accentColor"
                  type="color"
                  {...register("branding.accentColor")}
                  className="h-10"
                />
                {errors.branding?.accentColor && (
                  <p className="text-sm text-status-error">
                    {errors.branding.accentColor.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Tenant"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

