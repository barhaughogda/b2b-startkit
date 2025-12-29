'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ProviderProfile } from '@/types';
import { filterProfileByVisibility } from '@/lib/profileVisibility';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProviderPhilosophy } from '@/components/provider/ProviderPhilosophy';
import { ProviderVideoIntro } from '@/components/provider/ProviderVideoIntro';
import {
  User,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Award,
  GraduationCap,
  Loader2,
  AlertCircle,
  Globe,
  Stethoscope,
  Building2,
  Shield,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Id, Doc } from '@/convex/_generated/dataModel';

interface ProviderIntroductionModalProps {
  providerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * ProviderIntroductionModal
 * 
 * A rich modal for displaying detailed provider information to patients.
 * Uses patient-level visibility filtering for appropriate data access.
 * 
 * Features:
 * - Full profile display with photo, credentials, and bio
 * - Philosophy section with personal stories
 * - Video introduction with accessible player
 * - Practice details (languages, conditions, procedures)
 * - Book appointment and message actions
 */
export function ProviderIntroductionModal({
  providerId,
  open,
  onOpenChange,
}: ProviderIntroductionModalProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [user, setUser] = useState<Doc<'users'> | null>(null);

  // Get profile data
  const profileData = useQuery(
    api.providerProfiles.getPatientProviderProfile,
    providerId && session?.user?.tenantId
      ? {
          profileId: providerId as Id<'providerProfiles'>,
          tenantId: session.user.tenantId,
          patientId: undefined,
        }
      : 'skip'
  );

  // Get user info
  const userData = useQuery(
    api.users.getUser,
    profileData?.userId
      ? {
          id: profileData.userId,
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
    if (userData) {
      setUser(userData);
    }
  }, [userData]);

  const handleScheduleClick = useCallback(() => {
    onOpenChange(false);
    router.push(`/patient/appointments?providerId=${providerId}`);
  }, [onOpenChange, providerId, router]);

  const handleMessageClick = useCallback(() => {
    onOpenChange(false);
    router.push(`/patient/messages?providerId=${providerId}`);
  }, [onOpenChange, providerId, router]);

  const handleClose = () => {
    onOpenChange(false);
  };

  // Determine loading state
  const isLoading = profileData === undefined || userData === undefined;
  
  // Determine error state
  const hasError = profileData === null || userData === null || (!profile && profileData !== undefined);
  
  // Determine not found state (providerId provided but no data found)
  const isNotFound = providerId && !isLoading && hasError;

  // Build display name
  const displayName = user 
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Provider'
    : 'Provider';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-interactive-primary mb-4" />
            <p className="text-text-secondary">Loading provider information...</p>
          </div>
        ) : isNotFound ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <AlertCircle className="h-14 w-14 text-status-error mb-4" />
            <h3 className="text-xl font-semibold mb-2">Provider Not Found</h3>
            <p className="text-text-secondary text-center max-w-md mb-6">
              The provider profile you&apos;re looking for is not available. 
              This may be because the profile hasn&apos;t been published yet or 
              the provider is no longer part of your care team.
            </p>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <AlertCircle className="h-14 w-14 text-status-error mb-4" />
            <h3 className="text-xl font-semibold mb-2">Unable to Load Provider</h3>
            <p className="text-text-secondary text-center max-w-md mb-6">
              There was an error loading the provider information. 
              Please try again later or contact support if the problem persists.
            </p>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : profile && user ? (
          <>
            {/* Hero Header */}
            <div className="relative bg-gradient-to-br from-interactive-primary/5 to-surface-elevated">
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white transition-colors z-10"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 text-text-secondary" />
              </button>

              <div className="flex flex-col md:flex-row gap-6 p-6 md:p-8">
                {/* Photo */}
                <div className="flex-shrink-0">
                  {profile.professionalPhotoUrl ? (
                    <div className="w-36 h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden shadow-lg border-4 border-white">
                      <Image
                        src={profile.professionalPhotoUrl}
                        alt={profile.professionalPhotoAltText || `${displayName} - Professional Photo`}
                        width={176}
                        height={176}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-36 h-36 md:w-44 md:h-44 rounded-2xl flex items-center justify-center shadow-lg bg-interactive-primary">
                      <User className="h-20 w-20 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                        {displayName}
                      </h1>
                      {profile.isVerified && (
                        <CheckCircle2 className="h-6 w-6 text-status-success" />
                      )}
                    </div>
                    {profile.specialties && profile.specialties.length > 0 && (
                      <p className="text-lg text-text-secondary">
                        {profile.specialties[0]}
                      </p>
                    )}
                  </div>

                  {/* Specialties */}
                  {profile.specialties && profile.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {profile.specialties.map((specialty, idx) => (
                        <Badge 
                          key={idx} 
                          className="bg-interactive-primary text-white"
                        >
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                    {profile.boardCertifications && profile.boardCertifications.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Award className="h-4 w-4" />
                        <span>Board Certified</span>
                      </div>
                    )}
                    {profile.education && profile.education.length > 0 && (
                      <div className="flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        <span>{profile.education[0]?.degree || 'MD'}</span>
                      </div>
                    )}
                    {profile.languages && profile.languages.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Globe className="h-4 w-4" />
                        <span>{profile.languages.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Bio */}
              {(profile.detailedBio || profile.bio) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-interactive-primary" />
                      About
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-text-primary leading-relaxed whitespace-pre-line">
                      {profile.detailedBio || profile.bio}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Philosophy Section */}
              <ProviderPhilosophy
                philosophyOfCare={profile.philosophyOfCare}
                communicationStyle={profile.communicationStyle}
                whyIBecameADoctor={profile.whyIBecameADoctor}
              />

              {/* Video Introduction */}
              <ProviderVideoIntro
                videoUrl={profile.introductionVideoUrl}
                thumbnailUrl={profile.introductionVideoThumbnail}
                transcript={profile.introductionVideoTranscript}
                captionsUrl={profile.introductionVideoCaptions}
                altText={`${displayName} introduction video`}
              />

              {/* Practice Details */}
              {(profile.conditionsTreated?.length || 
                profile.proceduresPerformed?.length || 
                profile.hospitalAffiliations?.length ||
                profile.insuranceAccepted?.length) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="h-5 w-5 text-interactive-primary" />
                      Practice Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {profile.conditionsTreated && profile.conditionsTreated.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary mb-2">
                          Conditions Treated
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.conditionsTreated.slice(0, 8).map((condition, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {condition}
                            </Badge>
                          ))}
                          {profile.conditionsTreated.length > 8 && (
                            <Badge variant="secondary" className="text-xs">
                              +{profile.conditionsTreated.length - 8} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {profile.proceduresPerformed && profile.proceduresPerformed.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary mb-2">
                          Procedures
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.proceduresPerformed.slice(0, 6).map((procedure, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {procedure}
                            </Badge>
                          ))}
                          {profile.proceduresPerformed.length > 6 && (
                            <Badge variant="secondary" className="text-xs">
                              +{profile.proceduresPerformed.length - 6} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {profile.hospitalAffiliations && profile.hospitalAffiliations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Hospital Affiliations
                        </h4>
                        <ul className="text-sm text-text-secondary space-y-1">
                          {profile.hospitalAffiliations.map((hospital, idx) => (
                            <li key={idx}>
                              {typeof hospital === 'string' ? hospital : hospital.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {profile.insuranceAccepted && profile.insuranceAccepted.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Insurance Accepted
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.insuranceAccepted.slice(0, 6).map((insurance, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {insurance}
                            </Badge>
                          ))}
                          {profile.insuranceAccepted.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{profile.insuranceAccepted.length - 6} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Credentials */}
              {(profile.boardCertifications?.length || profile.education?.length) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-interactive-primary" />
                      Credentials
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profile.boardCertifications && profile.boardCertifications.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary mb-2">
                          Board Certifications
                        </h4>
                        <ul className="text-sm text-text-secondary space-y-1">
                          {profile.boardCertifications.map((cert, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <CheckCircle2 className="h-3 w-3 text-status-success" />
                              {typeof cert === 'string' ? cert : cert.specialty}
                              {typeof cert !== 'string' && cert.board && (
                                <span className="text-text-tertiary">({cert.board})</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {profile.education && profile.education.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                          <GraduationCap className="h-4 w-4" />
                          Education
                        </h4>
                        <ul className="text-sm text-text-secondary space-y-1">
                          {profile.education.map((edu, idx) => (
                            <li key={idx}>
                              {typeof edu === 'string' ? edu : (
                                <>
                                  <span className="font-medium">{edu.degree}</span>
                                  {edu.institution && ` - ${edu.institution}`}
                                  {edu.graduationYear && ` (${edu.graduationYear})`}
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border-primary">
                <Button
                  onClick={handleScheduleClick}
                  className="flex-1 bg-interactive-primary hover:bg-interactive-primary-hover text-white"
                  size="lg"
                >
                  <Calendar className="h-5 w-5 mr-2" />
                  Book Appointment
                </Button>
                <Button
                  variant="outline"
                  onClick={handleMessageClick}
                  className="flex-1 border-interactive-primary text-interactive-primary hover:bg-interactive-primary/10"
                  size="lg"
                >
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
