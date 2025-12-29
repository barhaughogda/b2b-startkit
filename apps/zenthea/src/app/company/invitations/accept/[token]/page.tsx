"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, User, Lock, Mail } from "lucide-react";
import { validatePassword } from "@/lib/validation/password";
import { toast } from "sonner";
import Link from "next/link";

// Force dynamic rendering - token is dynamic
export const dynamic = 'force-dynamic';

interface FormData {
  name: string;
  password: string;
  confirmPassword: string;
}

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [formData, setFormData] = useState<FormData>({
    name: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  // Fetch invitation data
  const invitation = useQuery(
    (api as any).invitations?.getInvitationByToken as any,
    token ? { token } : "skip"
  );

  // Handle invitation loading/error states
  useEffect(() => {
    if (invitation === undefined) {
      // Still loading
      return;
    }

    if (invitation === null) {
      setErrors(["Invalid or expired invitation link"]);
      return;
    }

    if (invitation.status !== "pending") {
      if (invitation.status === "expired") {
        setErrors(["This invitation has expired"]);
      } else if (invitation.status === "accepted") {
        setErrors(["This invitation has already been accepted"]);
      } else if (invitation.status === "cancelled") {
        setErrors(["This invitation has been cancelled"]);
      }
      return;
    }

    if (invitation.expiresAt < Date.now()) {
      setErrors(["This invitation has expired"]);
      return;
    }
  }, [invitation]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    // Name validation
    if (!formData.name.trim()) {
      newErrors.push("Name is required");
    } else if (formData.name.trim().length < 2) {
      newErrors.push("Name must be at least 2 characters long");
    }

    // Password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      newErrors.push(passwordValidation.error || "Invalid password");
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.push("Passwords do not match");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!token) {
      setErrors(["Invalid invitation token"]);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const response = await fetch(`/api/company/invitations/accept/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to accept invitation");
      }

      const result = await response.json();
      toast.success(result.message || "Account created successfully!");
      setIsAccepted(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/auth/signin?message=account-created");
      }, 3000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to accept invitation";
      setErrors([errorMessage]);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  // Loading state
  if (invitation === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-interactive-primary" />
              <p className="text-text-secondary">Loading invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state (invalid/expired invitation)
  if (invitation === null || errors.some((e) => e.includes("expired") || e.includes("already") || e.includes("cancelled") || e.includes("Invalid"))) {
    const hasError = errors.length > 0;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-status-error" />
              Invitation Error
            </CardTitle>
            <CardDescription>
              {hasError ? errors[0] : "Unable to process this invitation"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-status-error bg-status-error/10">
              <AlertCircle className="h-4 w-4 text-status-error" />
              <AlertDescription>
                {hasError ? (
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                ) : (
                  "The invitation link is invalid or has expired. Please contact the person who invited you for a new invitation."
                )}
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button asChild variant="outline">
                <Link href="/auth/signin">Go to Sign In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isAccepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-status-success" />
              Account Created Successfully!
            </CardTitle>
            <CardDescription>
              Your account has been created. You will be redirected to sign in shortly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-status-success bg-status-success/10">
              <CheckCircle2 className="h-4 w-4 text-status-success" />
              <AlertDescription>
                Welcome to Zenthea! Your account has been created successfully. You can now sign in with your email and password.
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button asChild>
                <Link href="/auth/signin">Sign In Now</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            {invitation && (
              <>
                You&apos;ve been invited to join <strong>{invitation.email}</strong>. 
                Create your account to get started.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.length > 0 && (
              <Alert className="border-status-error bg-status-error/10">
                <AlertCircle className="h-4 w-4 text-status-error" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Email (read-only) */}
            {invitation && (
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-text-tertiary" />
                  <Input
                    id="email"
                    type="email"
                    value={invitation.email}
                    disabled
                    className="pl-10 bg-background-secondary"
                  />
                </div>
                <p className="text-xs text-text-tertiary">
                  This is the email address associated with your invitation
                </p>
              </div>
            )}

            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Full Name <span className="text-status-error">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-text-tertiary" />
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  disabled={isSubmitting}
                  required
                  aria-required="true"
                  aria-invalid={errors.some((e) => e.includes("name"))}
                  placeholder="Enter your full name"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-status-error">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-text-tertiary" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  disabled={isSubmitting}
                  required
                  aria-required="true"
                  aria-invalid={errors.some((e) => e.includes("password"))}
                  placeholder="Create a password"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-text-tertiary hover:text-text-primary"
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-text-tertiary">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirm Password <span className="text-status-error">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-text-tertiary" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  disabled={isSubmitting}
                  required
                  aria-required="true"
                  aria-invalid={errors.some((e) => e.includes("match"))}
                  placeholder="Confirm your password"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-text-tertiary hover:text-text-primary"
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Expiration Info */}
            {invitation && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  This invitation expires on{" "}
                  {new Date(invitation.expiresAt).toLocaleDateString()}
                </AlertDescription>
              </Alert>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

