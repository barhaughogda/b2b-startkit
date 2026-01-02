'use client';

import React from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ClinicLayout } from '@/components/layout/ClinicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  Globe, 
  ShieldCheck, 
  Settings, 
  Eye, 
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';

export default function WebsiteSettingsLauncherPage() {
  const { data: session, status } = useZentheaSession();
  const tenantId = session?.user?.tenantId;

  const websiteData = useQuery(
    (api as any).websiteBuilder?.getWebsiteBuilder,
    tenantId ? { tenantId } : 'skip'
  );

  const isPublished = !!websiteData?.websiteBuilder?.publishedAt;
  const lastPublished = websiteData?.websiteBuilder?.publishedAt 
    ? new Date(websiteData.websiteBuilder.publishedAt).toLocaleDateString() 
    : 'Never';

  // The URL for the new standalone website builder app
  const builderUrl = process.env.NEXT_PUBLIC_WEBSITES_BUILDER_URL || 'http://localhost:3002';
  const launchBuilder = () => {
    window.open(`${builderUrl}?tenantId=${tenantId}`, '_blank');
  };

  if (status === 'loading') {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-interactive-primary" />
        </div>
      </ClinicLayout>
    );
  }

  return (
    <ClinicLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton href="/company/settings" />
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Clinic Website</h1>
              <p className="text-text-secondary">Manage your public marketing website</p>
            </div>
          </div>
          {isPublished && (
            <Badge variant="outline" className="bg-status-success/10 text-status-success border-status-success/20 gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Published
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Launcher Card */}
          <Card className="md:col-span-2 border-interactive-primary/20 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Website Builder</CardTitle>
                  <CardDescription>
                    Custom-built section-based editor for your clinic.
                  </CardDescription>
                </div>
                <div className="p-2 bg-interactive-primary/10 rounded-lg">
                  <Globe className="w-6 h-6 text-interactive-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-background-secondary p-4 rounded-lg flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-interactive-primary mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-text-primary">PHI Isolation Protocol</p>
                  <p className="text-text-secondary">
                    The Website Builder operates in a secure, non-PHI environment. Your marketing content 
                    is stored separately from patient records for maximum compliance.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <Button onClick={launchBuilder} size="lg" className="bg-interactive-primary hover:bg-interactive-primary-hover gap-2">
                  Launch Editor
                  <ExternalLink className="w-4 h-4" />
                </Button>
                {isPublished && (
                  <Button variant="outline" size="lg" asChild>
                    <a href={`/clinic/${websiteData?.slug}`} target="_blank" rel="noopener noreferrer" className="gap-2">
                      <Eye className="w-4 h-4" />
                      View Live Site
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats/Status Card */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-text-tertiary">Site Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border-primary">
                  <span className="text-sm text-text-secondary">Last Published</span>
                  <span className="text-sm font-medium text-text-primary">{lastPublished}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border-primary">
                  <span className="text-sm text-text-secondary">Domain</span>
                  <span className="text-sm font-medium text-text-primary">
                    {websiteData?.slug ? `${websiteData.slug}.zenthea.ai` : 'None'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-text-secondary">Pages</span>
                  <span className="text-sm font-medium text-text-primary">
                    {websiteData?.websiteBuilder?.pages?.length || 1}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="p-4 bg-status-info/5 border border-status-info/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2 text-status-info">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Pro Tip</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Use the "Booking Block" in the editor to automatically link patients to your 
                secure scheduling wizard in this portal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ClinicLayout>
  );
}
