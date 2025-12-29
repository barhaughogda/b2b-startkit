/**
 * Constants for Provider Profile
 * 
 * Centralized constants, labels, placeholders, and configurations
 * for provider profile forms and validation.
 */

export const DEFAULT_SPECIALTIES: string[] = [];
export const DEFAULT_LANGUAGES: string[] = [];

export const FIELD_LABELS = {
  title: 'Title/Prefix',
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  phone: 'Phone',
  gender: 'Gender',
  dateOfBirth: 'Date of Birth',
  specialties: 'Specialties',
  languages: 'Languages Spoken',
  bio: 'Professional Bio',
  detailedBio: 'Detailed Bio',
  philosophyOfCare: 'Philosophy of Care',
  whyIBecameADoctor: 'Why I Became a Doctor',
  conditionsTreated: 'Conditions Treated',
  proceduresPerformed: 'Procedures Performed',
  introductionVideoUrl: 'Introduction Video',
} as const;

export const FIELD_PLACEHOLDERS = {
  title: 'Select title',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '(555) 123-4567',
  gender: 'Select gender (optional)',
  dateOfBirth: 'YYYY-MM-DD',
  specialties: 'e.g., Internal Medicine, Cardiology',
  languages: 'e.g., English, Spanish, French',
  bio: 'Write a brief professional bio (2-3 sentences)...',
  detailedBio: 'Tell patients more about your background and experience...',
  philosophyOfCare: 'Describe your approach to patient care...',
  whyIBecameADoctor: 'Share your personal story...',
  conditionsTreated: 'e.g., Diabetes, Hypertension, Heart Disease',
  proceduresPerformed: 'e.g., Annual Physical, EKG, Blood Tests',
  introductionVideoUrl: 'YouTube or Vimeo URL',
} as const;

export const FIELD_HELP_TEXT = {
  title: 'Your professional title',
  firstName: 'Your first name',
  lastName: 'Your last name',
  email: 'Your professional email address',
  phone: 'Your work phone number',
  gender: 'Optional demographic information',
  dateOfBirth: 'Optional: Used for age calculation',
  specialties: 'Separate multiple specialties with commas',
  languages: 'List all languages you can communicate in with patients',
  bio: 'This will be visible on your public profile',
  detailedBio: 'Optional: Provide more detailed information about your background and experience',
  philosophyOfCare: 'Optional: Share your approach to patient care and treatment philosophy',
  whyIBecameADoctor: 'Optional: Share your personal journey and what inspired you to become a healthcare provider',
  conditionsTreated: 'List the conditions you treat',
  proceduresPerformed: 'List the procedures you perform',
  introductionVideoUrl: 'Optional: Add a 2-3 minute introduction video',
} as const;

export const MAX_FIELD_LENGTHS = {
  bio: 500,
  detailedBio: 5000,
  philosophyOfCare: 2000,
  whyIBecameADoctor: 2000,
  communicationStyle: 1000,
  communityInvolvement: 1000,
} as const;

