'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ProviderProfile, PatientTestimonial } from '@/types';
import { filterProfileByVisibility } from '@/lib/profileVisibility';
import { ProviderProfileHeader } from '@/components/provider/ProviderProfileHeader';
import { ProviderCredentials } from '@/components/provider/ProviderCredentials';
import { ProviderPhilosophy } from '@/components/provider/ProviderPhilosophy';
import { ProviderVideoIntro } from '@/components/provider/ProviderVideoIntro';
import { ProviderTestimonials } from '@/components/provider/ProviderTestimonials';
import { ProviderContactActions } from '@/components/provider/ProviderContactActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function PatientProviderProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useZentheaSession();
  const providerId = params.providerId as string;
  
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [testimonials, setTestimonials] = useState<PatientTestimonial[]>([]);
  const [user, setUser] = useState<any>(null);
  
  // Get profile data
  const profileData = useQuery(
    api.providerProfiles.getPatientProviderProfile,
    providerId && session?.user?.tenantId
      ? {
          profileId: providerId as any,
          tenantId: session.user.tenantId,
          patientId: undefined // Would be session user's patient ID
        }
      : 'skip'
  );
  
  // Get testimonials
  const testimonialsData = useQuery(
    api.providerProfiles.getProviderTestimonials,
    providerId && session?.user?.tenantId
      ? {
          providerProfileId: providerId as any,
          tenantId: session.user.tenantId,
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
      // Filter profile for patient view
      const filtered = filterProfileByVisibility(profileData, 'patient');
      setProfile(filtered as ProviderProfile);
    }
  }, [profileData]);
  
  useEffect(() => {
    if (testimonialsData) {
      // Transform Convex data to match PatientTestimonial type
      const transformed = testimonialsData.map((testimonial) => ({
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
    router.push(`/patient/appointments?providerId=${providerId}`);
  };
  
  const handleMessageClick = () => {
    router.push(`/patient/messages?providerId=${providerId}`);
  };
  
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-status-error mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-text-secondary mb-4">Please log in to view provider profiles.</p>
          <Button asChild>
            <Link href="/patient/login">Log In</Link>
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
            <Link href="/patient/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background-primary">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        {/* Profile Header */}
        <ProviderProfileHeader
          profile={profile}
          user={user}
          showCredentials={true}
        />
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Credentials */}
            <ProviderCredentials
              boardCertifications={profile.boardCertifications}
              education={profile.education}
              certifications={profile.certifications}
              showVerifiedOnly={false}
            />
            
            {/* Philosophy & Communication */}
            <ProviderPhilosophy
              philosophyOfCare={profile.philosophyOfCare}
              communicationStyle={profile.communicationStyle}
              whyIBecameADoctor={profile.whyIBecameADoctor}
              detailedBio={profile.detailedBio}
            />
            
            {/* Video Introduction */}
            <ProviderVideoIntro
              videoUrl={profile.introductionVideoUrl}
              thumbnailUrl={profile.introductionVideoThumbnail}
              transcript={profile.introductionVideoTranscript}
              captionsUrl={profile.introductionVideoCaptions}
              altText={`${user?.firstName || ''} ${user?.lastName || ''} introduction video`.trim()}
            />
            
            {/* Testimonials */}
            {testimonials.length > 0 && (
              <ProviderTestimonials
                testimonials={testimonials}
                showAll={false}
                limit={5}
              />
            )}
          </div>
          
          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Contact Actions */}
            <ProviderContactActions
              providerId={providerId}
              onScheduleClick={handleScheduleClick}
              onMessageClick={handleMessageClick}
              email={user?.email}
              showEmail={false}
            />
            
            {/* Practice Details */}
            {(profile.conditionsTreated?.length || profile.proceduresPerformed?.length || profile.languages?.length) && (
              <Card>
                <CardHeader>
                  <CardTitle>Practice Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile.languages && profile.languages.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-2">Languages Spoken</h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.languages.map((lang, idx) => (
                          <Badge key={idx} variant="outline">
                            {lang}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {profile.conditionsTreated && profile.conditionsTreated.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-2">Conditions Treated</h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.conditionsTreated.slice(0, 5).map((condition, idx) => (
                          <Badge key={idx} variant="secondary">
                            {condition}
                          </Badge>
                        ))}
                        {profile.conditionsTreated.length > 5 && (
                          <Badge variant="secondary">
                            +{profile.conditionsTreated.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {profile.proceduresPerformed && profile.proceduresPerformed.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-2">Procedures</h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.proceduresPerformed.slice(0, 5).map((procedure, idx) => (
                          <Badge key={idx} variant="secondary">
                            {procedure}
                          </Badge>
                        ))}
                        {profile.proceduresPerformed.length > 5 && (
                          <Badge variant="secondary">
                            +{profile.proceduresPerformed.length - 5} more
                          </Badge>
                        )}
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
                  <div className="space-y-2">
                    {profile.hospitalAffiliations.map((affiliation, idx) => (
                      <div key={idx} className="text-sm">
                        <div className="font-medium text-text-primary">{affiliation.name}</div>
                        {affiliation.role && (
                          <div className="text-text-secondary">{affiliation.role}</div>
                        )}
                        {affiliation.clinic && (
                          <div className="text-text-tertiary text-xs">{affiliation.clinic}</div>
                        )}
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
  );
}

