'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ProviderProfile, PatientTestimonial } from '@/types';
import { filterProfileByVisibility } from '@/lib/profileVisibility';
import { ProviderProfileHeader } from '@/components/provider/ProviderProfileHeader';
import { ProviderCredentials } from '@/components/provider/ProviderCredentials';
import { ProviderContactActions } from '@/components/provider/ProviderContactActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertCircle, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Metadata } from 'next';
import { useTenantId, isValidTenantId } from '@/hooks/useTenantId';

/**
 * Validates that a provider ID is a valid Convex ID format
 */
function isValidConvexId(id: string | undefined): id is string {
  if (!id || typeof id !== 'string') {
    return false;
  }
  // Convex IDs follow the pattern: tableName:hash
  // Basic validation: should contain a colon and have reasonable length
  return id.includes(':') && id.length > 5 && id.length < 100;
}

export default function PublicProviderProfilePage() {
  const params = useParams();
  const router = useRouter();
  const providerIdParam = params.providerId as string | undefined;
  
  // Extract tenant ID from URL/subdomain/environment
  const tenantId = useTenantId();
  
  // Validate provider ID
  const providerId = providerIdParam && isValidConvexId(providerIdParam) 
    ? providerIdParam as Id<'providerProfiles'>
    : null;
  
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [testimonials, setTestimonials] = useState<PatientTestimonial[]>([]);
  const [user, setUser] = useState<{ firstName?: string; lastName?: string; email?: string } | null>(null);
  
  // Get public profile data
  const profileData = useQuery(
    api.providerProfiles.getPublicProviderProfile,
    providerId && tenantId && isValidTenantId(tenantId)
      ? {
          profileId: providerId,
          tenantId: tenantId
        }
      : 'skip'
  );
  
  // Get testimonials (only public ones)
  const testimonialsData = useQuery(
    api.providerProfiles.getProviderTestimonials,
    providerId && tenantId && isValidTenantId(tenantId)
      ? {
          providerProfileId: providerId,
          tenantId: tenantId,
          includeUnpublished: false
        }
      : 'skip'
  );
  
  // Get user info
  const userData = useQuery(
    api.users.getUser,
    profileData?.userId
      ? {
          id: profileData.userId
        }
      : 'skip'
  );
  
  useEffect(() => {
    if (profileData) {
      // Filter profile for public view (most restrictive)
      const filtered = filterProfileByVisibility(profileData, 'public');
      setProfile(filtered as ProviderProfile);
    }
  }, [profileData]);
  
  useEffect(() => {
    if (testimonialsData) {
      // Filter testimonials to only show published ones and transform Convex data to match PatientTestimonial type
      const published = testimonialsData.filter(t => t.isPublished);
      const transformed = published.map((testimonial) => ({
        id: testimonial._id as string,
        providerProfileId: testimonial.providerProfileId as string,
        tenantId: testimonial.tenantId,
        patientId: testimonial.patientId as string | undefined,
        patientFirstName: testimonial.patientFirstName,
        patientLastNameInitial: testimonial.patientLastNameInitial,
        rating: testimonial.rating,
        comment: testimonial.comment,
        consentGiven: testimonial.consentGiven,
        isVerified: testimonial.isVerified,
        isApproved: testimonial.isApproved,
        isPublished: testimonial.isPublished,
        createdAt: new Date(testimonial.createdAt),
        updatedAt: new Date(testimonial.updatedAt),
      }));
      setTestimonials(transformed);
    }
  }, [testimonialsData]);
  
  useEffect(() => {
    if (userData) {
      setUser(userData);
    }
  }, [userData]);
  
  const handleScheduleClick = () => {
    // Redirect to appointment booking
    router.push(`/appointments?providerId=${providerId}`);
  };
  
  // Show error if tenant ID cannot be determined
  if (!tenantId || !isValidTenantId(tenantId)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-status-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Tenant Not Specified</h2>
          <p className="text-text-secondary mb-4">
            Unable to determine tenant context. Please access this page through a valid tenant URL.
          </p>
          <Button asChild variant="outline">
            <Link href="/public/providers">Browse Providers</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Show error if provider ID is invalid
  if (!providerId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-status-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Invalid Provider ID</h2>
          <p className="text-text-secondary mb-4">The provider ID in the URL is invalid.</p>
          <Button asChild variant="outline">
            <Link href="/public/providers">Browse Providers</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (profileData === undefined || userData === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-zenthea-teal" />
      </div>
    );
  }
  
  if (!profile || !profileData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-status-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Provider Not Found</h2>
          <p className="text-text-secondary mb-4">The provider profile you&apos;re looking for doesn&apos;t exist or isn&apos;t available.</p>
          <Button asChild variant="outline">
            <Link href="/public/providers">Browse Providers</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  const displayName = user 
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Provider'
    : 'Provider';
  
  return (
    <>
      {/* SEO Metadata would be added via Next.js metadata API */}
      <div className="min-h-screen bg-background-primary">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Providers
          </Button>
          
          {/* Profile Header */}
          <ProviderProfileHeader
            profile={profile}
            user={user ?? undefined}
            showCredentials={true}
          />
          
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Credentials - Public view emphasizes credentials */}
              <ProviderCredentials
                boardCertifications={profile.boardCertifications}
                education={profile.education}
                certifications={profile.certifications}
                showVerifiedOnly={true}
              />
              
              {/* Bio */}
              {profile.bio && (
                <Card>
                  <CardHeader>
                    <CardTitle>About {displayName.split(' ')[0]}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-text-primary whitespace-pre-line leading-relaxed">
                      {profile.bio}
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {/* Practice Details */}
              {(profile.conditionsTreated?.length || profile.proceduresPerformed?.length) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Areas of Expertise</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profile.conditionsTreated && profile.conditionsTreated.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary mb-2">Conditions Treated</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.conditionsTreated.map((condition, idx) => (
                            <Badge key={idx} variant="secondary">
                              {condition}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {profile.proceduresPerformed && profile.proceduresPerformed.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary mb-2">Procedures Performed</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.proceduresPerformed.map((procedure, idx) => (
                            <Badge key={idx} variant="secondary">
                              {procedure}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Hospital Affiliations */}
              {profile.hospitalAffiliations && profile.hospitalAffiliations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Hospital Affiliations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {profile.hospitalAffiliations.map((affiliation, idx) => (
                        <div key={idx} className="flex items-start justify-between p-3 bg-background-secondary rounded-md">
                          <div>
                            <div className="font-medium text-text-primary">{affiliation.name}</div>
                            {affiliation.role && (
                              <div className="text-sm text-text-secondary">{affiliation.role}</div>
                            )}
                            {affiliation.clinic && (
                              <div className="text-xs text-text-tertiary mt-1">{affiliation.clinic}</div>
                            )}
                          </div>
                          {affiliation.current && (
                            <Badge variant="outline" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Research & Publications (if public) */}
              {profile.publications && profile.publications.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Research & Publications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {profile.publications.map((pub, idx) => (
                        <div key={idx} className="text-sm">
                          <div className="font-medium text-text-primary">{pub.title}</div>
                          {pub.journal && (
                            <div className="text-text-secondary">{pub.journal}</div>
                          )}
                          {pub.year && (
                            <div className="text-text-tertiary text-xs">{pub.year}</div>
                          )}
                          {pub.url && (
                            <a
                              href={pub.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zenthea-teal hover:underline text-xs"
                            >
                              View Publication
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Strong CTA for Public View */}
              <Card className="bg-zenthea-teal/10 border-zenthea-teal">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <h3 className="text-xl font-semibold text-text-primary">
                      Schedule an Appointment
                    </h3>
                    <p className="text-sm text-text-secondary">
                      Book your visit with {displayName.split(' ')[0]}
                    </p>
                    <Button
                      onClick={handleScheduleClick}
                      className="w-full"
                      size="lg"
                    >
                      <Calendar className="h-5 w-5 mr-2" />
                      Schedule Now
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      size="lg"
                      asChild
                    >
                      <Link href="/patient/register">
                        Become a Patient
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Languages */}
              {profile.languages && profile.languages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Languages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profile.languages.map((lang, idx) => (
                        <Badge key={idx} variant="outline">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Insurance Accepted */}
              {profile.insuranceAccepted && profile.insuranceAccepted.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Insurance Accepted</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {profile.insuranceAccepted.map((insurance, idx) => (
                        <div key={idx} className="text-sm text-text-primary">
                          {insurance}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

