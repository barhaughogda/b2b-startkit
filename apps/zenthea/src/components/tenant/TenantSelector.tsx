"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Building2, 
  Search, 
  ArrowRight, 
  Loader2,
  Globe
} from "lucide-react";

interface TenantSelectorProps {
  onSelect?: (tenantId: string, slug: string) => void;
  className?: string;
}

/**
 * Tenant Selector Component
 * 
 * Displays a list of available tenants for users to select which portal to login to.
 * Used on the main login page when a non-superadmin user needs to choose their organization.
 */
export function TenantSelector({ onSelect, className }: TenantSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const tenants = useQuery(api.publicLanding.listTenantsForSelector);
  const isLoading = tenants === undefined;

  type TenantItem = NonNullable<typeof tenants>[number];

  // Filter tenants based on search
  const filteredTenants = tenants?.filter((tenant: TenantItem) =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.slug?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSelect = (tenant: TenantItem) => {
    if (tenant.slug) {
      // Navigate to tenant's login page
      const loginUrl = `/clinic/${tenant.slug}/login`;
      if (onSelect) {
        onSelect(tenant.id, tenant.slug);
      } else {
        window.location.href = loginUrl;
      }
    } else if (onSelect && tenant.domains?.subdomain) {
      // If onSelect callback provided but no slug, use subdomain as slug
      onSelect(tenant.id, tenant.domains.subdomain);
    } else if (tenant.domains?.subdomain) {
      // Use subdomain
      const loginUrl = `https://${tenant.domains.subdomain}.zenthea.ai/login`;
      window.location.href = loginUrl;
    } else if (tenant.domains?.customDomain) {
      // Use custom domain
      const loginUrl = `https://${tenant.domains.customDomain}/login`;
      window.location.href = loginUrl;
    }
  };

  return (
    <div className={className}>
      {/* Search */}
      <div className="mb-6">
        <Label htmlFor="tenant-search" className="sr-only">Search organizations</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            id="tenant-search"
            type="text"
            placeholder="Search for your organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
          <p className="text-text-secondary">
            {searchQuery 
              ? "No organizations found matching your search." 
              : "No organizations available."
            }
          </p>
        </div>
      )}

      {/* Tenant list */}
      {!isLoading && filteredTenants.length > 0 && (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {filteredTenants.map((tenant: TenantItem) => (
            <Card 
              key={tenant.id}
              className="cursor-pointer hover:shadow-md transition-shadow hover:border-zenthea-teal"
              onClick={() => handleSelect(tenant)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Logo/Avatar */}
                  <div className="flex-shrink-0">
                    {tenant.logo ? (
                      <img 
                        src={tenant.logo} 
                        alt={`${tenant.name} logo`}
                        className="h-12 w-12 rounded-lg object-contain bg-surface-secondary"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-zenthea-teal/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-zenthea-teal" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-text-primary truncate">
                      {tenant.name}
                    </h3>
                    <p className="text-sm text-text-tertiary truncate flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {tenant.domains?.customDomain || 
                       (tenant.domains?.subdomain ? `${tenant.domains.subdomain}.zenthea.ai` : 
                        (tenant.slug ? `zenthea.ai/clinic/${tenant.slug}` : 'zenthea.ai'))}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0">
                    <ArrowRight className="h-5 w-5 text-text-tertiary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Tenant Selector Card - Standalone card version for embedding in pages
 */
export function TenantSelectorCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Choose Your Organization
        </CardTitle>
        <CardDescription>
          Select your organization to continue to the login page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TenantSelector />
      </CardContent>
    </Card>
  );
}

