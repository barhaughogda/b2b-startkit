'use client';

import React from 'react';
import Image from 'next/image';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProviderPhilosophy } from './ProviderPhilosophy';
import { ProviderVideoIntro } from './ProviderVideoIntro';
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

interface ProviderDetailModalProps {
  publicProfileId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Viewer type for visibility filtering */
  viewerType?: 'public' | 'patient';
  /** Tenant slug for booking navigation */
  tenantSlug?: string;
  /** Whether booking is enabled */
  isBookingEnabled?: boolean;
  /** Branding color for theming */
  brandingColor?: string;
  /** Callback when book appointment is clicked */
  onBookClick?: () => void;
  /** Callback when send message is clicked (patient only) */
  onMessageClick?: () => void;
}

/**
 * ProviderDetailModal
 * 
 * A unified modal for displaying detailed provider information.
 * Works for both public visitors and authenticated patients.
 * 
 * Features:
 * - Full profile display with photo, credentials, and bio
 * - Philosophy section with "Why I became a doctor" story
 * - Video introduction with accessible player
 * - Practice details (languages, conditions, procedures)
 * - Book appointment and message actions
 */
export function ProviderDetailModal({
  publicProfileId,
  open,
  onOpenChange,
  viewerType = 'public',
  tenantSlug,
  isBookingEnabled = true,
  brandingColor,
  onBookClick,
  onMessageClick,
}: ProviderDetailModalProps) {
  // Fetch full provider profile data
  const profile = useQuery(
    api.publicLanding.getPublicProviderFullProfile,
    publicProfileId
      ? { publicProfileId: publicProfileId as Id<'publicProviderProfiles'> }
      : 'skip'
  );

  const isLoading = profile === undefined && publicProfileId !== null;
  const hasError = profile === null && publicProfileId !== null;

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto p-0"
        style={{
          '--brand-color': brandingColor || 'var(--zenthea-teal)',
        } as React.CSSProperties}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 
              className="h-10 w-10 animate-spin mb-4" 
              style={{ color: brandingColor || 'var(--zenthea-teal)' }}
            />
            <p className="text-text-secondary">Loading provider information...</p>
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <AlertCircle className="h-14 w-14 text-status-error mb-4" />
            <h3 className="text-xl font-semibold mb-2">Provider Not Found</h3>
            <p className="text-text-secondary text-center max-w-md mb-6">
              The provider profile you&apos;re looking for is not available. 
              This may be because the profile hasn&apos;t been published yet.
            </p>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : profile ? (
          <>
            {/* Hero Header */}
            <div 
              className="relative bg-gradient-to-br from-background-secondary to-surface-elevated"
              style={{
                background: `linear-gradient(135deg, ${brandingColor || 'var(--zenthea-teal)'}10 0%, var(--surface-elevated) 100%)`
              }}
            >
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
                  {profile.photo ? (
                    <div className="w-36 h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden shadow-lg border-4 border-white">
                      <Image
                        src={profile.photo}
                        alt={`${profile.displayName} - ${profile.title}`}
                        width={176}
                        height={176}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div 
                      className="w-36 h-36 md:w-44 md:h-44 rounded-2xl flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: brandingColor || 'var(--zenthea-teal)' }}
                    >
                      <User className="h-20 w-20 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                        {profile.displayName}
                      </h1>
                      {profile.isVerified && (
                        <CheckCircle2 className="h-6 w-6 text-status-success" />
                      )}
                    </div>
                    <p className="text-lg text-text-secondary">{profile.title}</p>
                  </div>

                  {/* Specialties */}
                  {profile.specialties && profile.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {profile.specialties.map((specialty, idx) => (
                        <Badge 
                          key={idx} 
                          className="text-white"
                          style={{ backgroundColor: brandingColor || 'var(--zenthea-teal)' }}
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

                  {/* Status Badge */}
                  {profile.acceptingNewPatients && (
                    <Badge className="bg-status-success/90 text-white border-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Accepting New Patients
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 space-y-6">
              {/* Bio */}
              {profile.bio && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" style={{ color: brandingColor || 'var(--zenthea-teal)' }} />
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
                altText={`${profile.displayName} introduction video`}
              />

              {/* Practice Details */}
              {(profile.conditionsTreated?.length || 
                profile.proceduresPerformed?.length || 
                profile.hospitalAffiliations?.length ||
                profile.insuranceAccepted?.length) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="h-5 w-5" style={{ color: brandingColor || 'var(--zenthea-teal)' }} />
                      Practice Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {profile.conditionsTreated && profile.conditionsTreated.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
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
                      <Award className="h-5 w-5" style={{ color: brandingColor || 'var(--zenthea-teal)' }} />
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
                          {profile.education.map((edu, idx) => {
                            if (typeof edu === 'string') return <li key={idx}>{edu}</li>;
                            const year = 'graduationYear' in edu ? edu.graduationYear : ('year' in edu ? (edu as { year?: number }).year : undefined);
                            return (
                              <li key={idx}>
                                <span className="font-medium">{edu.degree}</span>
                                {edu.institution && ` - ${edu.institution}`}
                                {year && ` (${year})`}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border-primary">
                {isBookingEnabled && profile.bookingEnabled !== false && onBookClick && (
                  <Button
                    onClick={onBookClick}
                    className="flex-1 text-white"
                    size="lg"
                    style={{ backgroundColor: brandingColor || 'var(--zenthea-teal)' }}
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    Book Appointment
                  </Button>
                )}
                {viewerType === 'patient' && onMessageClick && (
                  <Button
                    variant="outline"
                    onClick={onMessageClick}
                    className="flex-1"
                    size="lg"
                    style={{ 
                      borderColor: brandingColor || 'var(--zenthea-teal)',
                      color: brandingColor || 'var(--zenthea-teal)',
                    }}
                  >
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Send Message
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default ProviderDetailModal;

