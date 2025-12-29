/**
 * Profile Visibility System
 * 
 * Handles field-level privacy controls for provider profiles with role-based filtering
 * and smart defaults based on healthcare industry best practices.
 */

import { ProfileVisibility, ProfileVisibilitySettings, ProviderProfile } from '@/types'

export type ViewerRole = 'public' | 'patient' | 'provider' | 'admin'

/**
 * Smart default visibility settings based on healthcare best practices
 * - Public: Credentials, specialties, basic bio, professional photo
 * - Portal: Above + philosophy, detailed bio, video, communication style, testimonials
 * - Private: License numbers, NPI (admin only), personal contact info
 */
export function getDefaultVisibilitySettings(): ProfileVisibilitySettings {
  return {
    // Identity fields - mostly public for trust building
    npi: 'private', // NPI should be private (admin only)
    licenseNumber: 'private', // License numbers private for security
    specialties: 'public', // Specialties public for discovery
    
    // Credentials - public for trust building
    boardCertifications: 'public',
    education: 'public',
    certifications: 'public',
    
    // Personal content - portal for deeper engagement
    bio: 'public', // Short bio public
    detailedBio: 'portal', // Detailed bio for patients
    philosophyOfCare: 'portal', // Philosophy for patient engagement
    communicationStyle: 'portal', // Communication style for patients
    whyIBecameADoctor: 'portal', // Personal story for patients
    languages: 'public', // Languages public for accessibility
    
    // Humanizing elements - portal for patient connection
    personalInterests: 'portal',
    communityInvolvement: 'portal',
    
    // Multimedia - public photo, portal video
    professionalPhoto: 'public', // Photo public for recognition
    introductionVideo: 'portal', // Video for patient engagement
    
    // Practice details - public for discovery
    hospitalAffiliations: 'public',
    insuranceAccepted: 'public',
    conditionsTreated: 'public',
    proceduresPerformed: 'public',
    researchInterests: 'public',
    publications: 'public',
    
    // Testimonials - portal for patient trust
    testimonials: 'portal'
  }
}

/**
 * Check if a field should be visible to a viewer based on their role
 */
export function isFieldVisible(
  fieldName: keyof ProfileVisibilitySettings,
  visibility: ProfileVisibilitySettings,
  viewerRole: ViewerRole
): boolean {
  const fieldVisibility = visibility[fieldName]
  
  // Admins can see everything
  if (viewerRole === 'admin') {
    return true
  }
  
  // Providers can see their own profile fully
  if (viewerRole === 'provider') {
    return true
  }
  
  // Public viewers can only see public fields
  if (viewerRole === 'public') {
    return fieldVisibility === 'public'
  }
  
  // Patient viewers can see public and portal fields
  if (viewerRole === 'patient') {
    return fieldVisibility === 'public' || fieldVisibility === 'portal'
  }
  
  return false
}

/**
 * Filter a provider profile based on viewer role
 * Returns a new object with only visible fields
 */
export function filterProfileByVisibility(
  profile: ProviderProfile,
  viewerRole: ViewerRole
): Partial<ProviderProfile> {
  const filtered: Partial<ProviderProfile> = {
    _id: profile._id,
    userId: profile.userId,
    tenantId: profile.tenantId,
    specialties: profile.specialties, // Always visible for basic identification
    languages: profile.languages, // Always visible for accessibility
    visibility: profile.visibility,
    completionPercentage: profile.completionPercentage,
    isVerified: profile.isVerified,
    isPublished: profile.isPublished,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  }
  
  // Identity fields
  if (isFieldVisible('npi', profile.visibility, viewerRole)) {
    filtered.npi = profile.npi
  }
  if (isFieldVisible('licenseNumber', profile.visibility, viewerRole)) {
    filtered.licenseNumber = profile.licenseNumber
    filtered.licenseState = profile.licenseState
  }
  
  // Credentials
  if (isFieldVisible('boardCertifications', profile.visibility, viewerRole)) {
    filtered.boardCertifications = profile.boardCertifications
  }
  if (isFieldVisible('education', profile.visibility, viewerRole)) {
    filtered.education = profile.education
  }
  if (isFieldVisible('certifications', profile.visibility, viewerRole)) {
    filtered.certifications = profile.certifications
  }
  
  // Personal content
  if (isFieldVisible('bio', profile.visibility, viewerRole)) {
    filtered.bio = profile.bio
  }
  if (isFieldVisible('detailedBio', profile.visibility, viewerRole)) {
    filtered.detailedBio = profile.detailedBio
  }
  if (isFieldVisible('philosophyOfCare', profile.visibility, viewerRole)) {
    filtered.philosophyOfCare = profile.philosophyOfCare
  }
  if (isFieldVisible('communicationStyle', profile.visibility, viewerRole)) {
    filtered.communicationStyle = profile.communicationStyle
  }
  if (isFieldVisible('whyIBecameADoctor', profile.visibility, viewerRole)) {
    filtered.whyIBecameADoctor = profile.whyIBecameADoctor
  }
  
  // Humanizing elements
  if (isFieldVisible('personalInterests', profile.visibility, viewerRole)) {
    filtered.personalInterests = profile.personalInterests
  }
  if (isFieldVisible('communityInvolvement', profile.visibility, viewerRole)) {
    filtered.communityInvolvement = profile.communityInvolvement
    // volunteerWork uses the same visibility as communityInvolvement
    filtered.volunteerWork = profile.volunteerWork
  }
  
  // Multimedia
  if (isFieldVisible('professionalPhoto', profile.visibility, viewerRole)) {
    filtered.professionalPhotoUrl = profile.professionalPhotoUrl
    filtered.professionalPhotoAltText = profile.professionalPhotoAltText
  }
  if (isFieldVisible('introductionVideo', profile.visibility, viewerRole)) {
    filtered.introductionVideoUrl = profile.introductionVideoUrl
    filtered.introductionVideoThumbnail = profile.introductionVideoThumbnail
    filtered.introductionVideoTranscript = profile.introductionVideoTranscript
    filtered.introductionVideoCaptions = profile.introductionVideoCaptions
  }
  
  // Practice details
  if (isFieldVisible('hospitalAffiliations', profile.visibility, viewerRole)) {
    filtered.hospitalAffiliations = profile.hospitalAffiliations
  }
  if (isFieldVisible('insuranceAccepted', profile.visibility, viewerRole)) {
    filtered.insuranceAccepted = profile.insuranceAccepted
  }
  if (isFieldVisible('conditionsTreated', profile.visibility, viewerRole)) {
    filtered.conditionsTreated = profile.conditionsTreated
  }
  if (isFieldVisible('proceduresPerformed', profile.visibility, viewerRole)) {
    filtered.proceduresPerformed = profile.proceduresPerformed
  }
  if (isFieldVisible('researchInterests', profile.visibility, viewerRole)) {
    filtered.researchInterests = profile.researchInterests
    // clinicalInterests uses the same visibility as researchInterests
    filtered.clinicalInterests = profile.clinicalInterests
  }
  if (isFieldVisible('publications', profile.visibility, viewerRole)) {
    filtered.publications = profile.publications
  }
  
  // Testimonials
  if (isFieldVisible('testimonials', profile.visibility, viewerRole)) {
    filtered.testimonials = profile.testimonials
  }
  
  return filtered
}

/**
 * Calculate profile completion percentage
 * Based on required fields and recommended fields
 */
export function calculateCompletionPercentage(profile: Partial<ProviderProfile>): number {
  const requiredFields = [
    'specialties',
    'bio',
    'professionalPhotoUrl'
  ]
  
  const recommendedFields = [
    'detailedBio',
    'philosophyOfCare',
    'boardCertifications',
    'education',
    'languages',
    'hospitalAffiliations',
    'insuranceAccepted',
    'conditionsTreated',
    'introductionVideoUrl'
  ]
  
  let completedRequired = 0
  let completedRecommended = 0
  
  // Check required fields
  requiredFields.forEach(field => {
    const value = profile[field as keyof ProviderProfile]
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        if (value.length > 0) completedRequired++
      } else {
        completedRequired++
      }
    }
  })
  
  // Check recommended fields
  recommendedFields.forEach(field => {
    const value = profile[field as keyof ProviderProfile]
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        if (value.length > 0) completedRecommended++
      } else {
        completedRecommended++
      }
    }
  })
  
  // Weight: 60% required, 40% recommended
  const requiredScore = (completedRequired / requiredFields.length) * 60
  const recommendedScore = (completedRecommended / recommendedFields.length) * 40
  
  return Math.round(requiredScore + recommendedScore)
}

/**
 * Get visibility label for display
 */
export function getVisibilityLabel(visibility: ProfileVisibility): string {
  switch (visibility) {
    case 'public':
      return 'Public Website'
    case 'portal':
      return 'Patient Portal'
    case 'private':
      return 'Private (Admin Only)'
    default:
      return 'Unknown'
  }
}

/**
 * Get visibility description for tooltips
 */
export function getVisibilityDescription(visibility: ProfileVisibility): string {
  switch (visibility) {
    case 'public':
      return 'Visible to anyone on the public website'
    case 'portal':
      return 'Visible to patients logged into the portal'
    case 'private':
      return 'Only visible to administrators'
    default:
      return ''
  }
}

