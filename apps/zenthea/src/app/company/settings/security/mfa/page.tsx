"use client";

import { useState, useEffect } from "react";
import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, AlertCircle, Shield, Key, QrCode, RefreshCw } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { canUseConvexQuery } from "@/lib/convexIdValidation";
import { BackButton } from "@/components/ui/back-button";

type SetupStep = "setup" | "verification" | "success" | "manage";

interface SetupInfo {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  encryptedSecret: string;
}

export default function MFASetupPage() {
  const { data: session, status } = useZentheaSession();
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>("setup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupInfo, setSetupInfo] = useState<SetupInfo | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackupCode, setCopiedBackupCode] = useState<number | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[] | null>(null);

  // Check if we can query Convex
  const canQuery = canUseConvexQuery(session?.user?.id, session?.user?.tenantId);

  // Get MFA status
  const mfaStatus = useQuery(
    api.mfa.getMFAStatus,
    canQuery && session?.user?.id
      ? { userId: session.user.id as Id<"users"> }
      : "skip"
  );

  // Check if MFA is enabled and show management view
  useEffect(() => {
    if (mfaStatus?.enabled && step === "setup") {
      setStep("manage");
    }
  }, [mfaStatus?.enabled, step]);

  // Load setup information on mount
  useEffect(() => {
    if (status === "authenticated" && step === "setup") {
      loadSetupInfo();
    }
  }, [status, step]);

  const loadSetupInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/company/mfa/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to generate MFA setup information");
      }

      setSetupInfo(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load MFA setup information"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!setupInfo) return;

    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/company/mfa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: verificationCode,
          secret: setupInfo.secret,
          backupCodes: setupInfo.backupCodes,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to verify MFA code");
      }

      // Move to success step
      setStep("success");
      setShowBackupCodes(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to verify code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: "secret" | "backup", index?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "secret") {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      } else if (type === "backup" && index !== undefined) {
        setCopiedBackupCode(index);
        setTimeout(() => setCopiedBackupCode(null), 2000);
      }
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const handleFinish = () => {
    router.push("/company/settings/security");
  };

  const handleRegenerateBackupCodes = async () => {
    if (!confirm("Are you sure you want to regenerate your backup codes? Your old backup codes will no longer work.")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/company/mfa/regenerate-backup-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to regenerate backup codes");
      }

      // Show the new backup codes
      setRegeneratedCodes(data.backupCodes);
      setShowBackupCodes(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to regenerate backup codes"
      );
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-text-secondary">Loading...</p>
        </div>
      </ClinicLayout>
    );
  }

  if (status === "unauthenticated") {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-text-secondary">Please sign in to access this page.</p>
        </div>
      </ClinicLayout>
    );
  }

  return (
    <ClinicLayout>
      <div className="max-w-4xl mx-auto">
        <BackButton href="/company/settings/security" label="Back to Security Settings" />
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Set Up Multi-Factor Authentication
          </h1>
          <p className="text-text-secondary mt-1">
            Add an extra layer of security to your account with TOTP authentication
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-status-error">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-status-error">
                <AlertCircle className="h-5 w-5" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Management View: MFA Already Enabled */}
        {step === "manage" && mfaStatus?.enabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-status-success">
                <Check className="h-6 w-6" />
                Multi-Factor Authentication Enabled
              </CardTitle>
              <CardDescription>
                Your account is protected with multi-factor authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 text-sm">
                <p className="text-text-secondary">
                  <span className="font-medium">Method:</span> {mfaStatus.method?.toUpperCase() || "TOTP"}
                </p>
                {mfaStatus.setupCompletedAt && (
                  <p className="text-text-secondary">
                    <span className="font-medium">Setup completed:</span>{" "}
                    {new Date(mfaStatus.setupCompletedAt).toLocaleDateString()}
                  </p>
                )}
                {mfaStatus.backupCodesCount !== undefined && (
                  <p className="text-text-secondary">
                    <span className="font-medium">Backup codes remaining:</span> {mfaStatus.backupCodesCount}
                  </p>
                )}
              </div>

              {/* Backup Codes Management */}
              <div className="space-y-4">
                <div className="flex items-start gap-2 p-4 bg-status-warning/10 border border-status-warning rounded-lg">
                  <AlertCircle className="h-5 w-5 text-status-warning mt-0.5 flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      Backup Codes
                    </p>
                    <p className="text-sm text-text-secondary">
                      Backup codes can be used to access your account if you lose access to your authenticator app. 
                      Each code can only be used once. Regenerating codes will invalidate all existing backup codes.
                    </p>
                  </div>
                </div>

                {regeneratedCodes && showBackupCodes && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 p-4 bg-status-info/10 border border-status-info rounded-lg">
                      <AlertCircle className="h-5 w-5 text-status-info mt-0.5 flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <p className="text-sm font-medium text-text-primary">
                          New Backup Codes Generated
                        </p>
                        <p className="text-sm text-text-secondary">
                          Save these codes now - you won&apos;t be able to see them again. Your old backup codes are no longer valid.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-4 bg-background-elevated rounded-lg border border-border-primary">
                      {regeneratedCodes.map((code, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-2 p-2 bg-background-primary rounded border border-border-primary"
                        >
                          <code className="text-sm font-mono text-text-primary">{code}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(code, "backup", index)}
                            title="Copy backup code"
                          >
                            {copiedBackupCode === index ? (
                              <Check className="h-3 w-3 text-status-success" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={handleRegenerateBackupCodes}
                  disabled={loading}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  {loading ? "Regenerating..." : "Regenerate Backup Codes"}
                </Button>
              </div>

              <div className="flex justify-end pt-4 border-t border-border-primary">
                <Button variant="outline" onClick={() => router.push("/company/settings/security")}>
                  Back to Security Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Setup Step: QR Code and Secret */}
        {step === "setup" && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Scan QR Code</CardTitle>
              <CardDescription>
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading && !setupInfo ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-text-secondary">Generating setup information...</p>
                </div>
              ) : setupInfo ? (
                <>
                  {/* QR Code Display */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-background-primary rounded-lg border-2 border-border-primary">
                      <img
                        src={setupInfo.qrCode}
                        alt="MFA QR Code"
                        className="w-64 h-64"
                      />
                    </div>
                    <p className="text-sm text-text-secondary text-center">
                      Scan this QR code with your authenticator app
                    </p>
                  </div>

                  {/* Secret Key Display */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Or enter this secret key manually:
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={setupInfo.secret}
                        readOnly
                        className="font-mono text-sm bg-background-elevated"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(setupInfo.secret, "secret")}
                        title="Copy secret key"
                      >
                        {copiedSecret ? (
                          <Check className="h-4 w-4 text-status-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-text-tertiary">
                      Use this if you can&apos;t scan the QR code
                    </p>
                  </div>

                  {/* Next Step Button */}
                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setStep("verification")} disabled={loading}>
                      I&apos;ve scanned the QR code
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 py-8">
                  <AlertCircle className="h-12 w-12 text-status-error" />
                  <p className="text-text-secondary">
                    Failed to load setup information. Please try again.
                  </p>
                  <Button onClick={loadSetupInfo} variant="outline">
                    Retry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Verification Step */}
        {step === "verification" && setupInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Verify Setup</CardTitle>
              <CardDescription>
                Enter the 6-digit code from your authenticator app to verify setup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  Verification Code
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setVerificationCode(value);
                    setError(null);
                  }}
                  placeholder="000000"
                  className="text-center text-2xl font-mono tracking-widest"
                  autoFocus
                />
                <p className="text-xs text-text-tertiary">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("setup");
                    setVerificationCode("");
                    setError(null);
                  }}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button onClick={handleVerifyCode} disabled={loading || verificationCode.length !== 6}>
                  {loading ? "Verifying..." : "Verify & Complete Setup"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Step: Backup Codes */}
        {step === "success" && setupInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-status-success">
                <Check className="h-6 w-6" />
                MFA Setup Complete!
              </CardTitle>
              <CardDescription>
                Your account is now protected with multi-factor authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Backup Codes */}
              <div className="space-y-4">
                <div className="flex items-start gap-2 p-4 bg-status-info/10 border border-status-info rounded-lg">
                  <AlertCircle className="h-5 w-5 text-status-info mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-text-primary">
                      Save Your Backup Codes
                    </p>
                    <p className="text-sm text-text-secondary">
                      These codes can be used to access your account if you lose access to your
                      authenticator app. Each code can only be used once. Store them in a safe place.
                    </p>
                  </div>
                </div>

                {showBackupCodes && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 p-4 bg-background-elevated rounded-lg border border-border-primary">
                      {setupInfo.backupCodes.map((code, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-2 p-2 bg-background-primary rounded border border-border-primary"
                        >
                          <code className="text-sm font-mono text-text-primary">{code}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(code, "backup", index)}
                            title="Copy backup code"
                          >
                            {copiedBackupCode === index ? (
                              <Check className="h-3 w-3 text-status-success" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-text-tertiary">
                      {setupInfo.backupCodes.length} backup codes generated. Save these codes now -
                      you won&apos;t be able to see them again.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleFinish}>Done</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ClinicLayout>
  );
}

