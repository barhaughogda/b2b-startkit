'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ProviderProfile } from '@/types';
import { ProviderProfileCard } from '@/components/provider/ProviderProfileCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Grid, List, X, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { convex } from '@/lib/convex-client';
import { useTenantId, isValidTenantId } from '@/hooks/useTenantId';

type ViewMode = 'grid' | 'list';
type SortOption = 'name' | 'specialty' | 'rating';

// Component that uses Convex hooks (only rendered when Convex is configured)
function ProviderDirectoryContent() {
  const router = useRouter();
  const tenantId = useTenantId();

  // All hooks must be called before any conditional returns
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  
  // Pagination state - moved before conditional return
  const [currentPage, setCurrentPage] = useState(1);
  const [cursor, setCursor] = useState<string | null>(null);
  // Track cursor history for backward navigation (Convex pagination is forward-only)
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
  const itemsPerPage = 20;

  // Get published providers with pagination - conditional query args based on tenantId
  const providersData = useQuery(
    api.providerProfiles.getPublishedProviders,
    tenantId && isValidTenantId(tenantId)
      ? {
          tenantId: tenantId,
          limit: itemsPerPage,
          cursor: cursor || undefined
        }
      : 'skip'
  );

  // Get user data for each provider (simplified - in production, you'd batch this)
  const providers = useMemo(() => {
    if (!providersData?.providers) return [];

    // In a real implementation, you'd fetch user data for all providers
    // For now, we'll use the profile data directly
    return providersData.providers.map((profile: ProviderProfile) => ({
      profile,
      user: null // Would be fetched separately
    }));
  }, [providersData]);

  // Reset pagination when filters or search change (since they affect the result set)
  useEffect(() => {
    setCursor(null);
    setCurrentPage(1);
    setCursorHistory([]);
  }, [searchTerm, selectedSpecialty, selectedLanguage, sortBy]);

  // Extract unique specialties and languages
  const specialties = useMemo(() => {
    if (!providersData?.providers) return [];
    const allSpecialties = new Set<string>();
    providersData.providers.forEach((p: ProviderProfile) => {
      p.specialties?.forEach((s: string) => allSpecialties.add(s));
    });
    return Array.from(allSpecialties).sort();
  }, [providersData]);

  const languages = useMemo(() => {
    if (!providersData?.providers) return [];
    const allLanguages = new Set<string>();
    providersData.providers.forEach((p: ProviderProfile) => {
      p.languages?.forEach((l: string) => allLanguages.add(l));
    });
    return Array.from(allLanguages).sort();
  }, [providersData]);

  // Filter and sort providers
  const filteredProviders = useMemo(() => {
    if (!providers) return [];

    let filtered = [...providers];

    // Filter by search term (would search user names in production)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(({ profile }) => {
        // Search in specialties, bio, etc.
        const searchableText = [
          ...(profile.specialties || []),
          profile.bio || '',
          profile.detailedBio || ''
        ].join(' ').toLowerCase();
        return searchableText.includes(term);
      });
    }

    // Filter by specialty
    if (selectedSpecialty !== 'all') {
      filtered = filtered.filter(({ profile }) =>
        profile.specialties?.includes(selectedSpecialty)
      );
    }

    // Filter by language
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(({ profile }) =>
        profile.languages?.includes(selectedLanguage)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          // Would compare user names in production
          return 0;
        case 'specialty':
          const aSpecialty = a.profile.specialties?.[0] || '';
          const bSpecialty = b.profile.specialties?.[0] || '';
          return aSpecialty.localeCompare(bSpecialty);
        case 'rating':
          // Would use actual ratings in production
          return 0;
        default:
          return 0;
      }
    });

    return filtered;
  }, [providers, searchTerm, selectedSpecialty, selectedLanguage, sortBy]);

  // Handle pagination
  const handleNextPage = () => {
    if (providersData?.hasMore && providersData?.nextCursor) {
      // Save current cursor to history before moving forward
      setCursorHistory(prev => [...prev, cursor]);
      setCursor(providersData.nextCursor);
      setCurrentPage(prev => prev + 1);
      // Scroll to top of results
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1 && cursorHistory.length > 0) {
      // Get the previous cursor from history
      const previousCursor = cursorHistory[cursorHistory.length - 1];
      // Remove the last cursor from history
      setCursorHistory(prev => prev.slice(0, -1));
      if (previousCursor !== undefined) {
        setCursor(previousCursor);
      }
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentPage > 1) {
      // Fallback: if no history (shouldn't happen), go to first page
      setCursor(null);
      setCurrentPage(1);
      setCursorHistory([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Show error if tenant ID cannot be determined - moved after all hooks
  if (!tenantId || !isValidTenantId(tenantId)) {
    return (
      <div className="min-h-screen bg-background-primary">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-text-primary mb-2">Find a Provider</h1>
            <p className="text-text-secondary">
              Browse our team of experienced healthcare providers
            </p>
          </div>
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-status-error mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Tenant Not Specified</h2>
              <p className="text-text-secondary mb-4">
                Unable to determine tenant context. Please access this page through a valid tenant URL.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleScheduleClick = (providerId: string) => {
    router.push(`/appointments?providerId=${providerId}`);
  };

  const handleViewProfile = (providerId: string) => {
    router.push(`/public/providers/${providerId}`);
  };

  return (
    <div className="min-h-screen bg-background-primary">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-2">Find a Provider</h1>
          <p className="text-text-secondary">
            Browse our team of experienced healthcare providers
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <Input
                  placeholder="Search providers by name, specialty, or condition..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Specialties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specialties</SelectItem>
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Languages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    {languages.map((language) => (
                      <SelectItem key={language} value={language}>
                        {language}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="specialty">Specialty</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex-1" />

                {/* View Mode Toggle */}
                <div className="flex gap-2 border border-border-primary rounded-md p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="icon"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Active Filters */}
              {(selectedSpecialty !== 'all' || selectedLanguage !== 'all' || searchTerm) && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-text-secondary">Active filters:</span>
                  {searchTerm && (
                    <Badge variant="secondary" className="gap-1">
                      Search: {searchTerm}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSearchTerm('')}
                      />
                    </Badge>
                  )}
                  {selectedSpecialty !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      Specialty: {selectedSpecialty}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSelectedSpecialty('all')}
                      />
                    </Badge>
                  )}
                  {selectedLanguage !== 'all' && (
                    <Badge variant="secondary" className="gap-1">
                      Language: {selectedLanguage}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setSelectedLanguage('all')}
                      />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            {providersData ? (
              <>
                Showing {filteredProviders.length} of {providers.length} providers
                {providersData.hasMore && ' (more available)'}
              </>
            ) : (
              'Loading providers...'
            )}
          </p>
        </div>

        {/* Provider Grid/List */}
        {filteredProviders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-text-secondary mb-4">No providers found matching your criteria.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedSpecialty('all');
                  setSelectedLanguage('all');
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {filteredProviders.map(({ profile }) => (
              <ProviderProfileCard
                key={profile._id}
                profile={profile}
                user={undefined}
                showActions={true}
                onScheduleClick={() => handleScheduleClick(profile._id)}
                href={`/public/providers/${profile._id}`}
                compact={viewMode === 'list'}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {providersData && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <span className="text-sm text-text-secondary">
              Page {currentPage}
            </span>
            <Button
              variant="outline"
              onClick={handleNextPage}
              disabled={!providersData.hasMore}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Fallback component when Convex is not configured
function ProviderDirectoryFallback() {
  return (
    <div className="min-h-screen bg-background-primary">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary mb-2">Find a Provider</h1>
          <p className="text-text-secondary">
            Browse our team of experienced healthcare providers
          </p>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-text-secondary mb-4">
              Provider directory is not available. Convex backend is not configured.
            </p>
            <p className="text-sm text-text-tertiary">
              Please configure NEXT_PUBLIC_CONVEX_URL in your environment variables to enable this feature.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Loading skeleton for provider directory
function ProviderDirectoryLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background-primary">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="h-10 bg-surface-elevated rounded-md mb-2 w-48" />
          <div className="h-4 bg-surface-elevated rounded-md w-96" />
        </div>
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="h-10 bg-surface-elevated rounded-md" />
              <div className="grid grid-cols-3 gap-4">
                <div className="h-10 bg-surface-elevated rounded-md" />
                <div className="h-10 bg-surface-elevated rounded-md" />
                <div className="h-10 bg-surface-elevated rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-96 bg-surface-elevated rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Main component that conditionally renders based on Convex configuration
export default function PublicProviderDirectoryPage() {
  // Check if Convex is configured
  // Note: Only NEXT_PUBLIC_* env vars are available in client components
  const isConvexConfigured = !!convex && !!process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!isConvexConfigured) {
    return <ProviderDirectoryFallback />;
  }

  // Wrap ProviderDirectoryContent in Suspense to handle useSearchParams() during static generation
  // This prevents the "useSearchParams() should be wrapped in a suspense boundary" error
  return (
    <Suspense fallback={<ProviderDirectoryLoadingSkeleton />}>
      <ProviderDirectoryContent />
    </Suspense>
  );
}
