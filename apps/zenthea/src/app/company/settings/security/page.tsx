"use client";

import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useQuery } from "convex/react";
import Link from "next/link";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { canUseConvexQuery } from "@/lib/convexIdValidation";
import { SessionTimeoutConfig } from "@/components/clinic/SessionTimeoutConfig";
import { BackButton } from "@/components/ui/back-button";

export default function ClinicSecurityPage() {
  const { data: session, status } = useZentheaSession();

  // Check if we can query Convex
  const canQuery = canUseConvexQuery(session?.user?.id, session?.user?.tenantId);

  // Get MFA status
  const mfaStatus = useQuery(
    api.mfa.getMFAStatus,
    canQuery && session?.user?.id
      ? { userId: session.user.id as Id<"users"> }
      : "skip"
  );

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

  const isMFAEnabled = mfaStatus?.enabled || false;

  return (
    <ClinicLayout>
      <div className="max-w-7xl mx-auto">
        <BackButton />
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Security Settings</h1>
          <p className="text-text-secondary mt-1">
            Manage security policies and settings for your clinic
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* MFA Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Multi-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isMFAEnabled ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-status-success" />
                      <span className="text-sm font-medium text-text-primary">
                        MFA Enabled
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-status-error" />
                      <span className="text-sm font-medium text-text-primary">
                        MFA Not Enabled
                      </span>
                    </>
                  )}
                </div>
              </div>

              {isMFAEnabled && mfaStatus ? (
                <div className="space-y-2 text-sm text-text-secondary">
                  <p>
                    Method: <span className="font-medium">{mfaStatus.method?.toUpperCase() || "TOTP"}</span>
                  </p>
                  {mfaStatus.setupCompletedAt && (
                    <p>
                      Setup completed:{" "}
                      <span className="font-medium">
                        {new Date(mfaStatus.setupCompletedAt).toLocaleDateString()}
                      </span>
                    </p>
                  )}
                  {mfaStatus.backupCodesCount !== undefined && (
                    <p>
                      Backup codes remaining:{" "}
                      <span className="font-medium">{mfaStatus.backupCodesCount}</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-secondary">
                  Enable multi-factor authentication to protect your account with a second
                  verification step.
                </p>
              )}

              <div className="flex gap-2">
                {isMFAEnabled ? (
                  <Button variant="outline" asChild>
                    <Link href="/company/settings/security/mfa">
                      Manage MFA
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/company/settings/security/mfa">
                      Set Up MFA
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Password Policy Card */}
          <Card>
            <CardHeader>
              <CardTitle>Password Policy</CardTitle>
              <CardDescription>
                Password requirements and rotation settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary text-sm">
                Password policy features are being implemented as part of Phase 7 of the
                Access System Refactoring.
              </p>
            </CardContent>
          </Card>

          {/* Session Management Card */}
          <div className="md:col-span-2">
            <SessionTimeoutConfig />
          </div>

          {/* Audit Logging Card */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Logging</CardTitle>
              <CardDescription>
                View security events and access logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary text-sm">
                Audit logging features are being implemented as part of Phase 7 of the
                Access System Refactoring.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ClinicLayout>
  );
}

