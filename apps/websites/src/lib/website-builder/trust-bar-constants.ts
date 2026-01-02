/**
 * Trust Bar Constants
 *
 * Presets and configuration for the Trust Bar block builder.
 * Includes common healthcare insurance providers, accreditations,
 * compliance badges, rating sources, and professional affiliations.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface TrustBarPreset {
  id: string;
  label: string;
  shortLabel?: string; // For compact display
  logoUrl?: string; // Optional - falls back to icon
  verifyUrl?: string; // Link to verification page
  description?: string;
}

export interface RatingSource {
  id: string;
  label: string;
  shortLabel?: string;
  icon: string; // Icon identifier
  format: string; // e.g., "{rating}/5 on {source}"
  reviewFormat: string; // e.g., "{count} reviews"
  profileUrlTemplate?: string; // e.g., "https://google.com/maps/place/{placeId}"
}

export type TrustItemCategory =
  | 'insurance'
  | 'accreditation'
  | 'compliance'
  | 'rating'
  | 'affiliation'
  | 'award'
  | 'custom';

export interface TrustCategoryInfo {
  id: TrustItemCategory;
  label: string;
  description: string;
  icon: string;
}

// =============================================================================
// CATEGORY DEFINITIONS
// =============================================================================

export const TRUST_CATEGORIES: TrustCategoryInfo[] = [
  {
    id: 'insurance',
    label: 'Insurance',
    description: 'Accepted insurance providers',
    icon: 'Shield',
  },
  {
    id: 'accreditation',
    label: 'Accreditations',
    description: 'Healthcare accreditations and certifications',
    icon: 'Award',
  },
  {
    id: 'compliance',
    label: 'Compliance',
    description: 'Regulatory compliance badges',
    icon: 'ShieldCheck',
  },
  {
    id: 'rating',
    label: 'Ratings',
    description: 'Patient reviews and ratings',
    icon: 'Star',
  },
  {
    id: 'affiliation',
    label: 'Affiliations',
    description: 'Professional associations and memberships',
    icon: 'Users',
  },
  {
    id: 'award',
    label: 'Awards',
    description: 'Recognition and awards',
    icon: 'Trophy',
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Add your own trust signal',
    icon: 'Plus',
  },
];

// =============================================================================
// INSURANCE PRESETS
// =============================================================================

export const INSURANCE_PRESETS: TrustBarPreset[] = [
  // Major National Insurers
  {
    id: 'bcbs',
    label: 'Blue Cross Blue Shield',
    shortLabel: 'BCBS',
    description: 'Blue Cross Blue Shield network',
  },
  {
    id: 'aetna',
    label: 'Aetna',
    description: 'Aetna health insurance',
  },
  {
    id: 'united',
    label: 'United Healthcare',
    shortLabel: 'UHC',
    description: 'United Healthcare network',
  },
  {
    id: 'cigna',
    label: 'Cigna',
    description: 'Cigna health insurance',
  },
  {
    id: 'humana',
    label: 'Humana',
    description: 'Humana health insurance',
  },
  {
    id: 'anthem',
    label: 'Anthem',
    description: 'Anthem health insurance',
  },
  {
    id: 'kaiser',
    label: 'Kaiser Permanente',
    shortLabel: 'Kaiser',
    description: 'Kaiser Permanente network',
  },

  // Government Programs
  {
    id: 'medicare',
    label: 'Medicare',
    description: 'Medicare accepted',
    verifyUrl: 'https://www.medicare.gov',
  },
  {
    id: 'medicaid',
    label: 'Medicaid',
    description: 'Medicaid accepted',
  },
  {
    id: 'tricare',
    label: 'TRICARE',
    description: 'TRICARE military health insurance',
    verifyUrl: 'https://www.tricare.mil',
  },
  {
    id: 'champva',
    label: 'CHAMPVA',
    description: 'Civilian Health and Medical Program of VA',
  },

  // Other Major Insurers
  {
    id: 'molina',
    label: 'Molina Healthcare',
    shortLabel: 'Molina',
    description: 'Molina Healthcare network',
  },
  {
    id: 'centene',
    label: 'Centene',
    description: 'Centene health insurance',
  },
  {
    id: 'wellcare',
    label: 'WellCare',
    description: 'WellCare health plans',
  },
  {
    id: 'healthnet',
    label: 'Health Net',
    description: 'Health Net insurance',
  },
  {
    id: 'oscar',
    label: 'Oscar Health',
    shortLabel: 'Oscar',
    description: 'Oscar Health insurance',
  },
  {
    id: 'clover',
    label: 'Clover Health',
    shortLabel: 'Clover',
    description: 'Clover Health Medicare Advantage',
  },
];

// =============================================================================
// ACCREDITATION PRESETS
// =============================================================================

export const ACCREDITATION_PRESETS: TrustBarPreset[] = [
  {
    id: 'jcaho',
    label: 'Joint Commission Accredited',
    shortLabel: 'JCAHO',
    description: 'The Joint Commission healthcare accreditation',
    verifyUrl: 'https://www.jointcommission.org/what-we-offer/accreditation/health-care-settings/',
  },
  {
    id: 'dnv',
    label: 'DNV Healthcare Accredited',
    shortLabel: 'DNV',
    description: 'DNV GL Healthcare accreditation',
    verifyUrl: 'https://www.dnv.com/assurance/healthcare/',
  },
  {
    id: 'aaahc',
    label: 'AAAHC Accredited',
    shortLabel: 'AAAHC',
    description: 'Accreditation Association for Ambulatory Health Care',
    verifyUrl: 'https://www.aaahc.org/',
  },
  {
    id: 'ncqa',
    label: 'NCQA Recognized',
    shortLabel: 'NCQA',
    description: 'National Committee for Quality Assurance',
    verifyUrl: 'https://www.ncqa.org/',
  },
  {
    id: 'carf',
    label: 'CARF Accredited',
    shortLabel: 'CARF',
    description: 'Commission on Accreditation of Rehabilitation Facilities',
    verifyUrl: 'https://www.carf.org/',
  },
  {
    id: 'urac',
    label: 'URAC Accredited',
    shortLabel: 'URAC',
    description: 'URAC healthcare accreditation',
    verifyUrl: 'https://www.urac.org/',
  },
  {
    id: 'cap',
    label: 'CAP Accredited',
    shortLabel: 'CAP',
    description: 'College of American Pathologists laboratory accreditation',
    verifyUrl: 'https://www.cap.org/',
  },
  {
    id: 'aabb',
    label: 'AABB Accredited',
    shortLabel: 'AABB',
    description: 'Blood bank and transfusion services accreditation',
    verifyUrl: 'https://www.aabb.org/',
  },
];

// =============================================================================
// COMPLIANCE PRESETS
// =============================================================================

export const COMPLIANCE_PRESETS: TrustBarPreset[] = [
  {
    id: 'hipaa',
    label: 'HIPAA Compliant',
    shortLabel: 'HIPAA',
    description: 'Health Insurance Portability and Accountability Act compliance',
  },
  {
    id: 'onc',
    label: 'ONC Health IT Certified',
    shortLabel: 'ONC Certified',
    description: 'Office of the National Coordinator for Health IT certification',
    verifyUrl: 'https://www.healthit.gov/',
  },
  {
    id: 'soc2',
    label: 'SOC 2 Type II',
    shortLabel: 'SOC 2',
    description: 'Service Organization Control 2 compliance',
  },
  {
    id: 'hitrust',
    label: 'HITRUST CSF Certified',
    shortLabel: 'HITRUST',
    description: 'HITRUST Common Security Framework certification',
    verifyUrl: 'https://hitrustalliance.net/',
  },
  {
    id: 'iso27001',
    label: 'ISO 27001 Certified',
    shortLabel: 'ISO 27001',
    description: 'Information security management certification',
  },
  {
    id: 'pci',
    label: 'PCI DSS Compliant',
    shortLabel: 'PCI',
    description: 'Payment Card Industry Data Security Standard',
  },
  {
    id: 'gdpr',
    label: 'GDPR Compliant',
    shortLabel: 'GDPR',
    description: 'General Data Protection Regulation compliance',
  },
];

// =============================================================================
// RATING SOURCES
// =============================================================================

export const RATING_SOURCES: RatingSource[] = [
  {
    id: 'google',
    label: 'Google Reviews',
    shortLabel: 'Google',
    icon: 'google',
    format: '{rating}/5 on Google',
    reviewFormat: '{count} reviews',
    profileUrlTemplate: 'https://www.google.com/maps/place/?q=place_id:{placeId}',
  },
  {
    id: 'healthgrades',
    label: 'Healthgrades',
    shortLabel: 'Healthgrades',
    icon: 'healthgrades',
    format: '{rating}/5 on Healthgrades',
    reviewFormat: '{count} ratings',
    profileUrlTemplate: 'https://www.healthgrades.com/physician/{profileId}',
  },
  {
    id: 'zocdoc',
    label: 'Zocdoc',
    shortLabel: 'Zocdoc',
    icon: 'zocdoc',
    format: '{rating}/5 on Zocdoc',
    reviewFormat: '{count} reviews',
    profileUrlTemplate: 'https://www.zocdoc.com/doctor/{profileId}',
  },
  {
    id: 'vitals',
    label: 'Vitals',
    shortLabel: 'Vitals',
    icon: 'vitals',
    format: '{rating}/5 on Vitals',
    reviewFormat: '{count} reviews',
    profileUrlTemplate: 'https://www.vitals.com/doctors/{profileId}',
  },
  {
    id: 'webmd',
    label: 'WebMD',
    shortLabel: 'WebMD',
    icon: 'webmd',
    format: '{rating}/5 on WebMD',
    reviewFormat: '{count} ratings',
  },
  {
    id: 'yelp',
    label: 'Yelp',
    shortLabel: 'Yelp',
    icon: 'yelp',
    format: '{rating}/5 on Yelp',
    reviewFormat: '{count} reviews',
    profileUrlTemplate: 'https://www.yelp.com/biz/{profileId}',
  },
  {
    id: 'ratemds',
    label: 'RateMDs',
    shortLabel: 'RateMDs',
    icon: 'ratemds',
    format: '{rating}/5 on RateMDs',
    reviewFormat: '{count} ratings',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    shortLabel: 'Facebook',
    icon: 'facebook',
    format: '{rating}/5 on Facebook',
    reviewFormat: '{count} reviews',
  },
  {
    id: 'custom',
    label: 'Custom Rating',
    shortLabel: 'Rating',
    icon: 'star',
    format: '{rating}/5',
    reviewFormat: '{count} reviews',
  },
];

// =============================================================================
// AFFILIATION PRESETS
// =============================================================================

export const AFFILIATION_PRESETS: TrustBarPreset[] = [
  {
    id: 'ama',
    label: 'American Medical Association',
    shortLabel: 'AMA',
    description: 'AMA member',
    verifyUrl: 'https://www.ama-assn.org/',
  },
  {
    id: 'aafp',
    label: 'American Academy of Family Physicians',
    shortLabel: 'AAFP',
    description: 'AAFP member',
    verifyUrl: 'https://www.aafp.org/',
  },
  {
    id: 'acp',
    label: 'American College of Physicians',
    shortLabel: 'ACP',
    description: 'ACP member',
    verifyUrl: 'https://www.acponline.org/',
  },
  {
    id: 'acs',
    label: 'American College of Surgeons',
    shortLabel: 'ACS',
    description: 'ACS fellow',
    verifyUrl: 'https://www.facs.org/',
  },
  {
    id: 'acc',
    label: 'American College of Cardiology',
    shortLabel: 'ACC',
    description: 'ACC member',
    verifyUrl: 'https://www.acc.org/',
  },
  {
    id: 'aao',
    label: 'American Academy of Ophthalmology',
    shortLabel: 'AAO',
    description: 'AAO member',
    verifyUrl: 'https://www.aao.org/',
  },
  {
    id: 'aad',
    label: 'American Academy of Dermatology',
    shortLabel: 'AAD',
    description: 'AAD member',
    verifyUrl: 'https://www.aad.org/',
  },
  {
    id: 'ana',
    label: 'American Nurses Association',
    shortLabel: 'ANA',
    description: 'ANA member',
    verifyUrl: 'https://www.nursingworld.org/',
  },
  {
    id: 'ada',
    label: 'American Dental Association',
    shortLabel: 'ADA',
    description: 'ADA member',
    verifyUrl: 'https://www.ada.org/',
  },
  {
    id: 'apa',
    label: 'American Psychological Association',
    shortLabel: 'APA',
    description: 'APA member',
    verifyUrl: 'https://www.apa.org/',
  },
  {
    id: 'apta',
    label: 'American Physical Therapy Association',
    shortLabel: 'APTA',
    description: 'APTA member',
    verifyUrl: 'https://www.apta.org/',
  },
];

// =============================================================================
// AWARD PRESETS
// =============================================================================

export const AWARD_PRESETS: TrustBarPreset[] = [
  {
    id: 'usnews-best-hospitals',
    label: 'US News Best Hospitals',
    shortLabel: 'US News',
    description: 'Ranked in US News & World Report Best Hospitals',
    verifyUrl: 'https://health.usnews.com/best-hospitals',
  },
  {
    id: 'usnews-best-doctors',
    label: 'US News Top Doctors',
    shortLabel: 'Top Doctor',
    description: 'Featured in US News Top Doctors',
  },
  {
    id: 'castle-connolly',
    label: 'Castle Connolly Top Doctor',
    shortLabel: 'Castle Connolly',
    description: 'Castle Connolly Top Doctors recognition',
    verifyUrl: 'https://www.castleconnolly.com/',
  },
  {
    id: 'leapfrog-a',
    label: 'Leapfrog Hospital Safety Grade A',
    shortLabel: 'Leapfrog A',
    description: 'Leapfrog Hospital Safety Grade A rating',
    verifyUrl: 'https://www.hospitalsafetygrade.org/',
  },
  {
    id: 'magnet',
    label: 'Magnet Recognition',
    shortLabel: 'Magnet',
    description: 'ANCC Magnet Recognition Program',
    verifyUrl: 'https://www.nursingworld.org/organizational-programs/magnet/',
  },
  {
    id: 'patients-choice',
    label: "Patients' Choice Award",
    shortLabel: "Patients' Choice",
    description: "Vitals Patients' Choice Award",
  },
  {
    id: 'compassionate-doctor',
    label: 'Compassionate Doctor Recognition',
    shortLabel: 'Compassionate Doctor',
    description: 'Vitals Compassionate Doctor Recognition',
  },
  {
    id: 'super-doctors',
    label: 'Super Doctors',
    shortLabel: 'Super Doctor',
    description: 'Super Doctors recognition',
    verifyUrl: 'https://www.superdoctors.com/',
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all presets for a given category
 */
export function getPresetsForCategory(category: TrustItemCategory): TrustBarPreset[] {
  switch (category) {
    case 'insurance':
      return INSURANCE_PRESETS;
    case 'accreditation':
      return ACCREDITATION_PRESETS;
    case 'compliance':
      return COMPLIANCE_PRESETS;
    case 'affiliation':
      return AFFILIATION_PRESETS;
    case 'award':
      return AWARD_PRESETS;
    default:
      return [];
  }
}

/**
 * Find a preset by ID across all categories
 */
export function findPresetById(presetId: string): { preset: TrustBarPreset; category: TrustItemCategory } | null {
  const categories: Array<{ presets: TrustBarPreset[]; category: TrustItemCategory }> = [
    { presets: INSURANCE_PRESETS, category: 'insurance' },
    { presets: ACCREDITATION_PRESETS, category: 'accreditation' },
    { presets: COMPLIANCE_PRESETS, category: 'compliance' },
    { presets: AFFILIATION_PRESETS, category: 'affiliation' },
    { presets: AWARD_PRESETS, category: 'award' },
  ];

  for (const { presets, category } of categories) {
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      return { preset, category };
    }
  }

  return null;
}

/**
 * Find a rating source by ID
 */
export function findRatingSourceById(sourceId: string): RatingSource | null {
  return RATING_SOURCES.find((s) => s.id === sourceId) || null;
}

/**
 * Format a rating display string
 */
export function formatRatingDisplay(
  sourceId: string,
  rating: string,
  reviewCount?: string
): { ratingText: string; reviewText?: string } {
  const source = findRatingSourceById(sourceId);
  if (!source) {
    return { ratingText: `${rating}/5` };
  }

  const ratingText = source.format.replace('{rating}', rating);
  const reviewText = reviewCount ? source.reviewFormat.replace('{count}', reviewCount) : undefined;

  return { ratingText, reviewText };
}

/**
 * Get the icon name for a category
 */
export function getCategoryIcon(category: TrustItemCategory): string {
  const categoryInfo = TRUST_CATEGORIES.find((c) => c.id === category);
  return categoryInfo?.icon || 'CheckCircle';
}

/**
 * Get category info by ID
 */
export function getCategoryInfo(category: TrustItemCategory): TrustCategoryInfo | undefined {
  return TRUST_CATEGORIES.find((c) => c.id === category);
}
