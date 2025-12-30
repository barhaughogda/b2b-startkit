"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/hooks/useZentheaSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { validatePasswordPolicy, getPasswordRequirements } from "@/lib/password-policy";

function ChangePasswordForm() {
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("expired") === "true";

  useEffect(() => {
    // Get email and tenantId from sessionStorage (set by signin page)
    const storedEmail = sessionStorage.getItem("passwordChangeEmail");
    const storedTenantId = sessionStorage.getItem("passwordChangeTenantId");
    
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  useEffect(() => {
    // Validate password as user types
    if (newPassword) {
      const validation = validatePasswordPolicy(newPassword);
      setPasswordValidation(validation);
    } else {
      setPasswordValidation(null);
    }
  }, [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      setIsLoading(false);
      return;
    }

    // Validate password policy
    const validation = validatePasswordPolicy(newPassword);
    if (!validation.valid) {
      setError(validation.error || "Password does not meet requirements.");
      setIsLoading(false);
      return;
    }

    try {
      const tenantId = sessionStorage.getItem("passwordChangeTenantId") || "";

      // If password is expired, use special endpoint that doesn't require session authentication
      if (isExpired) {
        const changePasswordResponse = await fetch(
          "/api/auth/change-expired-password",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              tenantId,
              currentPassword,
              newPassword,
            }),
          }
        );

        const changePasswordResult = await changePasswordResponse.json();

        if (!changePasswordResponse.ok) {
          setError(
            changePasswordResult.message ||
              changePasswordResult.error ||
              "Failed to change password. Please try again."
          );
          setIsLoading(false);
          return;
        }
      } else {
        // Normal password change flow (for non-expired passwords)
        // First, authenticate to get user ID
        const authResult = await signIn("credentials", {
          email,
          password: currentPassword,
          tenantId,
          redirect: false,
        });

        if (authResult?.error) {
          setError("Current password is incorrect. Please try again.");
          setIsLoading(false);
          return;
        }

        // Get session to get user ID
        const sessionResponse = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        });

        if (!sessionResponse.ok) {
          setError("Failed to get user session. Please try again.");
          setIsLoading(false);
          return;
        }

        const session = await sessionResponse.json();
        const userId = session?.user?.id;

        if (!userId) {
          setError("User ID not found in session. Please try again.");
          setIsLoading(false);
          return;
        }

        // Change password via API
        const changePasswordResponse = await fetch(
          `/api/company/users/${userId}/change-password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              currentPassword,
              newPassword,
            }),
          }
        );

        const changePasswordResult = await changePasswordResponse.json();

        if (!changePasswordResponse.ok) {
          setError(
            changePasswordResult.message ||
              changePasswordResult.error ||
              "Failed to change password. Please try again."
          );
          setIsLoading(false);
          return;
        }
      }

      // Password changed successfully
      // Clear sessionStorage
      sessionStorage.removeItem("passwordChangeEmail");
      sessionStorage.removeItem("passwordChangeTenantId");

      // Redirect to sign in page with success message
      router.push("/auth/signin?passwordChanged=true");
    } catch (error: any) {
      console.error("Password change error:", error);
      setError(
        error?.message || "An error occurred. Please try again."
      );
      setIsLoading(false);
    }
  };

  const passwordRequirements = getPasswordRequirements();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isExpired ? (
              <>
                <AlertCircle className="h-5 w-5 text-status-warning" />
                Password Expired
              </>
            ) : (
              "Change Password"
            )}
          </CardTitle>
          <CardDescription>
            {isExpired
              ? "Your password has expired. Please change it to continue."
              : "Enter your current password and choose a new password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isExpired && (
              <Alert className="bg-status-warning/10 border-status-warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your password has expired. You must change it before you can
                  access your account.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || !!sessionStorage.getItem("passwordChangeEmail")}
                className="bg-background-elevated"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-background-elevated pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  disabled={isLoading}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-background-elevated pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  disabled={isLoading}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passwordValidation && (
                <div className="text-sm space-y-1">
                  {passwordValidation.valid ? (
                    <div className="flex items-center gap-2 text-status-success">
                      <CheckCircle className="h-4 w-4" />
                      <span>Password meets requirements</span>
                    </div>
                  ) : (
                    <div className="text-status-error">
                      {passwordValidation.error}
                    </div>
                  )}
                  {passwordValidation.details && (
                    <div className="mt-2 space-y-1 text-text-secondary">
                      <div className="font-medium">Requirements:</div>
                      <ul className="list-disc list-inside space-y-0.5 text-xs">
                        {passwordRequirements.map((req, idx) => (
                          <li key={idx}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-background-elevated pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword &&
                newPassword !== confirmPassword &&
                confirmPassword.length > 0 && (
                  <div className="text-sm text-status-error">
                    Passwords do not match
                  </div>
                )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !passwordValidation?.valid}
            >
              {isLoading ? "Changing Password..." : "Change Password"}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/auth/signin")}
                disabled={isLoading}
              >
                Back to Sign In
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background-primary p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Loading...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <ChangePasswordForm />
    </Suspense>
  );
}

