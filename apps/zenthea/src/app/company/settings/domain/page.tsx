"use client";

import React, { useState } from "react";
import { useZentheaSession } from "@/hooks/useZentheaSession";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Check,
  X,
  Loader2,
  AlertCircle,
  Copy,
  RefreshCw,
  Trash2,
  ExternalLink,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/ui/back-button";

/**
 * Custom Domain Settings Page
 * 
 * Allows clinic admins to configure a custom domain for their landing page.
 * Features:
 * - Add/remove custom domain
 * - DNS verification instructions
 * - Verification status checking
 */
export default function DomainSettingsPage() {
  const { data: session, status } = useZentheaSession();
  const tenantId = session?.user?.tenantId;

  // Fetch current domain config
  const domainConfig = useQuery(
    api.domains.getDomainConfig,
    tenantId ? { tenantId } : "skip"
  );

  const verificationStatus = useQuery(
    api.domains.getDomainVerificationStatus,
    tenantId ? { tenantId } : "skip"
  );

  // Mutations and actions
  const requestVerification = useMutation(api.domains.requestDomainVerification);
  const removeDomain = useMutation(api.domains.removeCustomDomain);
  const verifyDns = useAction(api.domains.verifyDomainDns);

  // Local state
  const [newDomain, setNewDomain] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Loading state
  if (status === "loading" || domainConfig === undefined) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
        </div>
      </ClinicLayout>
    );
  }

  // Auth check
  if (status === "unauthenticated" || !tenantId) {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-text-secondary">Please sign in to access this page.</p>
        </div>
      </ClinicLayout>
    );
  }

  const currentDomain = domainConfig?.domains?.customDomain;
  const isVerified = domainConfig?.domains?.customDomainVerified;

  // Add custom domain
  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDomain.trim()) {
      toast.error("Please enter a domain name");
      return;
    }

    setIsAdding(true);
    try {
      const result = await requestVerification({
        tenantId,
        customDomain: newDomain.trim().toLowerCase(),
      });

      toast.success(result.message);
      setNewDomain("");
      setShowAddForm(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add domain";
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
  };

  // Verify DNS
  const handleVerifyDns = async () => {
    if (!currentDomain) return;

    setIsVerifying(true);
    try {
      const result = await verifyDns({
        tenantId,
        customDomain: currentDomain,
      });

      if (result.verified) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: unknown) {
      toast.error("Failed to verify domain");
    } finally {
      setIsVerifying(false);
    }
  };

  // Remove domain
  const handleRemoveDomain = async () => {
    if (!confirm("Are you sure you want to remove this custom domain?")) {
      return;
    }

    setIsRemoving(true);
    try {
      await removeDomain({ tenantId });
      toast.success("Custom domain removed");
    } catch (error: unknown) {
      toast.error("Failed to remove domain");
    } finally {
      setIsRemoving(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <ClinicLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <BackButton />
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Custom Domain</h1>
          <p className="text-text-secondary mt-1">
            Connect your own domain to your public landing page
          </p>
        </div>

        <div className="space-y-6">
          {/* Current Domain Status */}
          {currentDomain && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Current Domain
                    </CardTitle>
                    <CardDescription>
                      Your custom domain configuration
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={isVerified ? "default" : "outline"}
                    className={isVerified 
                      ? "bg-status-success text-white" 
                      : "border-status-warning text-status-warning"
                    }
                  >
                    {isVerified ? (
                      <><Check className="h-3 w-3 mr-1" /> Verified</>
                    ) : (
                      <><AlertCircle className="h-3 w-3 mr-1" /> Pending Verification</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Domain Display */}
                <div className="bg-surface-secondary rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-text-tertiary">Domain</p>
                      <p className="text-lg font-medium text-text-primary">{currentDomain}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <a 
                        href={`https://${currentDomain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zenthea-teal hover:underline flex items-center gap-1"
                      >
                        Visit <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Verification Instructions (if not verified) */}
                {!isVerified && verificationStatus && (
                  <div className="border border-status-warning/30 rounded-lg p-4 bg-status-warning/5">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-status-warning flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-text-primary mb-2">
                          DNS Configuration Required
                        </h4>
                        <p className="text-sm text-text-secondary mb-4">
                          Add the following DNS record to verify your domain ownership:
                        </p>
                        
                        <div className="bg-white rounded-lg border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-surface-secondary">
                              <tr>
                                <th className="px-4 py-2 text-left font-medium text-text-secondary">Type</th>
                                <th className="px-4 py-2 text-left font-medium text-text-secondary">Host/Name</th>
                                <th className="px-4 py-2 text-left font-medium text-text-secondary">Value/Points To</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-4 py-3 font-mono">
                                  {verificationStatus.instructions.type}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                  <div className="flex items-center gap-2">
                                    {verificationStatus.instructions.host}
                                    <button 
                                      onClick={() => copyToClipboard(verificationStatus.instructions.host)}
                                      className="text-text-tertiary hover:text-text-primary"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-mono">
                                  <div className="flex items-center gap-2">
                                    {verificationStatus.instructions.value}
                                    <button 
                                      onClick={() => copyToClipboard(verificationStatus.instructions.value)}
                                      className="text-text-tertiary hover:text-text-primary"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <p className="text-xs text-text-tertiary mt-3">
                          DNS changes can take up to 48 hours to propagate, but usually complete within a few minutes.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {!isVerified && (
                    <Button
                      onClick={handleVerifyDns}
                      disabled={isVerifying}
                    >
                      {isVerifying ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Verify DNS
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleRemoveDomain}
                    disabled={isRemoving}
                    className="text-status-error border-status-error hover:bg-status-error/10"
                  >
                    {isRemoving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Remove Domain
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Domain Section */}
          {!currentDomain && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Add Custom Domain
                </CardTitle>
                <CardDescription>
                  Connect your own domain to create a fully branded experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showAddForm ? (
                  <div className="text-center py-8">
                    <Globe className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-text-primary mb-2">
                      No Custom Domain Configured
                    </h3>
                    <p className="text-text-secondary mb-6 max-w-md mx-auto">
                      Add a custom domain to give your patients a branded experience. 
                      For example: <span className="font-mono">portal.yourclinic.com</span>
                    </p>
                    <Button onClick={() => setShowAddForm(true)}>
                      Add Custom Domain
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleAddDomain} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newDomain">Domain Name</Label>
                      <Input
                        id="newDomain"
                        type="text"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        placeholder="portal.yourclinic.com"
                        disabled={isAdding}
                      />
                      <p className="text-xs text-text-tertiary">
                        Enter your domain without https:// (e.g., portal.yourclinic.com)
                      </p>
                    </div>

                    <div className="bg-surface-secondary rounded-lg p-4 text-sm">
                      <h4 className="font-medium text-text-primary mb-2">Before you begin:</h4>
                      <ul className="list-disc list-inside space-y-1 text-text-secondary">
                        <li>You must own or control the domain you want to use</li>
                        <li>You&apos;ll need access to your domain&apos;s DNS settings</li>
                        <li>SSL certificates are automatically provisioned</li>
                      </ul>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button type="submit" disabled={isAdding}>
                        {isAdding ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Add Domain
                      </Button>
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewDomain("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {/* Current URLs Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Your Landing Page URLs
              </CardTitle>
              <CardDescription>
                Patients can access your landing page using any of these URLs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Path-based URL */}
                {domainConfig?.slug && (
                  <div className="flex items-center justify-between bg-surface-secondary rounded-lg p-3">
                    <div>
                      <p className="text-xs text-text-tertiary mb-1">Path-Based URL</p>
                      <p className="font-mono text-sm">
                        https://zenthea.ai/clinic/{domainConfig.slug}
                      </p>
                    </div>
                    <Badge variant="outline">Always Available</Badge>
                  </div>
                )}

                {/* Subdomain URL */}
                {domainConfig?.domains?.subdomain && (
                  <div className="flex items-center justify-between bg-surface-secondary rounded-lg p-3">
                    <div>
                      <p className="text-xs text-text-tertiary mb-1">Subdomain URL</p>
                      <p className="font-mono text-sm">
                        https://{domainConfig.domains.subdomain}.zenthea.ai
                      </p>
                    </div>
                    <Badge variant="outline">Available</Badge>
                  </div>
                )}

                {/* Custom Domain URL */}
                {currentDomain && (
                  <div className="flex items-center justify-between bg-surface-secondary rounded-lg p-3">
                    <div>
                      <p className="text-xs text-text-tertiary mb-1">Custom Domain</p>
                      <p className="font-mono text-sm">
                        https://{currentDomain}
                      </p>
                    </div>
                    <Badge 
                      variant={isVerified ? "default" : "outline"}
                      className={isVerified ? "bg-status-success text-white" : ""}
                    >
                      {isVerified ? "Active" : "Pending"}
                    </Badge>
                  </div>
                )}

                {!domainConfig?.slug && !domainConfig?.domains?.subdomain && !currentDomain && (
                  <div className="text-center py-6">
                    <p className="text-text-secondary">
                      Configure your URL in{" "}
                      <a href="/company/profile" className="text-zenthea-teal hover:underline">
                        Company Profile
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ClinicLayout>
  );
}

