/**
 * Page Default Configurations
 * 
 * Default block configurations for standard website pages.
 * These provide pre-built content that tenants can customize,
 * rather than starting from scratch.
 */

import type { BlockInstance } from './types';

// =============================================================================
// SERVICES PAGE DEFAULTS
// =============================================================================

/**
 * Creates default blocks for the Services page
 */
export function createServicesPageBlocks(): BlockInstance[] {
  const timestamp = Date.now();
  
  return [
    {
      id: `services-hero-${timestamp}`,
      type: 'hero',
      enabled: true,
      props: {
        headline: 'Our Services',
        tagline: 'Comprehensive healthcare services tailored to your needs',
        backgroundType: 'gradient',
        gradientFrom: '#5FBFAF',
        gradientTo: '#5F284A',
        gradientDirection: 'to-br',
        alignment: 'center',
      },
    },
    {
      id: `services-main-${timestamp}`,
      type: 'services',
      enabled: true,
      props: {
        title: 'What We Offer',
        subtitle: 'From routine check-ups to specialized care, we provide a full range of medical services to keep you and your family healthy.',
        showDuration: true,
        showDescription: true,
        layout: 'grid',
      },
    },
    {
      id: `services-how-it-works-${timestamp}`,
      type: 'how-it-works',
      enabled: true,
      props: {
        title: 'How to Get Started',
        subtitle: 'Booking an appointment is quick and easy',
        steps: [
          {
            id: '1',
            number: 1,
            title: 'Choose Your Service',
            description: 'Browse our services and select the care you need',
            icon: 'Search',
          },
          {
            id: '2',
            number: 2,
            title: 'Book Online',
            description: 'Select a convenient time that works for your schedule',
            icon: 'Calendar',
          },
          {
            id: '3',
            number: 3,
            title: 'Visit Our Clinic',
            description: 'Come in for your appointment and receive personalized care',
            icon: 'Heart',
          },
        ],
      },
    },
    {
      id: `services-cta-${timestamp}`,
      type: 'cta-band',
      enabled: true,
      props: {
        headline: 'Ready to Schedule Your Visit?',
        subheadline: 'Book your appointment today and take the first step towards better health.',
        primaryCtaText: 'Book Appointment',
        secondaryCtaText: 'Contact Us',
        backgroundColor: 'primary',
      },
    },
  ];
}

// =============================================================================
// TEAM PAGE DEFAULTS
// =============================================================================

/**
 * Creates default blocks for the Our Team page
 */
export function createTeamPageBlocks(): BlockInstance[] {
  const timestamp = Date.now();
  
  return [
    {
      id: `team-hero-${timestamp}`,
      type: 'hero',
      enabled: true,
      props: {
        headline: 'Meet Our Care Team',
        tagline: 'Dedicated healthcare professionals committed to your wellbeing',
        backgroundType: 'gradient',
        gradientFrom: '#5FBFAF',
        gradientTo: '#5F284A',
        gradientDirection: 'to-br',
        alignment: 'center',
      },
    },
    {
      id: `team-main-${timestamp}`,
      type: 'care-team',
      enabled: true,
      props: {
        title: 'Our Providers',
        subtitle: 'Our team of experienced healthcare providers is here to deliver compassionate, high-quality care for you and your family.',
        maxProviders: 12,
        showSpecialties: true,
        showCredentials: true,
        showBookButton: true,
        layout: 'grid',
      },
    },
    {
      id: `team-trust-${timestamp}`,
      type: 'trust-bar',
      enabled: true,
      props: {
        items: [
          {
            id: 'board-certified',
            type: 'accreditation',
            label: 'Board Certified Physicians',
          },
          {
            id: 'years-experience',
            type: 'custom',
            label: 'Years of Combined Experience',
            value: '50+',
          },
          {
            id: 'patients-served',
            type: 'custom',
            label: 'Patients Served',
            value: '10,000+',
          },
          {
            id: 'patient-satisfaction',
            type: 'rating',
            label: 'Patient Satisfaction',
            value: '4.9/5',
          },
        ],
        layout: 'horizontal',
      },
    },
    {
      id: `team-cta-${timestamp}`,
      type: 'cta-band',
      enabled: true,
      props: {
        headline: 'Schedule with Our Team',
        subheadline: 'Choose a provider and book your appointment today.',
        primaryCtaText: 'Book Appointment',
        secondaryCtaText: 'View All Providers',
        backgroundColor: 'primary',
      },
    },
  ];
}

// =============================================================================
// LOCATIONS PAGE DEFAULTS
// =============================================================================

/**
 * Creates default blocks for the Locations page
 */
export function createLocationsPageBlocks(): BlockInstance[] {
  const timestamp = Date.now();
  
  return [
    {
      id: `locations-hero-${timestamp}`,
      type: 'hero',
      enabled: true,
      props: {
        headline: 'Our Locations',
        tagline: 'Convenient healthcare close to home',
        backgroundType: 'gradient',
        gradientFrom: '#5FBFAF',
        gradientTo: '#5F284A',
        gradientDirection: 'to-br',
        alignment: 'center',
      },
    },
    {
      id: `locations-main-${timestamp}`,
      type: 'clinics',
      enabled: true,
      props: {
        title: 'Find a Location Near You',
        subtitle: 'Visit any of our conveniently located clinics for quality healthcare services.',
        showMap: true,
        showHours: true,
        showPhone: true,
        layout: 'map-first',
      },
    },
    {
      id: `locations-contact-${timestamp}`,
      type: 'contact',
      enabled: true,
      props: {
        title: 'Hours & Contact Information',
        subtitle: 'We\'re here when you need us',
        showPhone: true,
        showEmail: true,
        showAddress: true,
        showHours: true,
        showMap: false,
        layout: 'card-grid',
      },
    },
    {
      id: `locations-cta-${timestamp}`,
      type: 'cta-band',
      enabled: true,
      props: {
        headline: 'Ready to Visit Us?',
        subheadline: 'Book an appointment at the location most convenient for you.',
        primaryCtaText: 'Book Appointment',
        secondaryCtaText: 'Get Directions',
        backgroundColor: 'primary',
      },
    },
  ];
}

// =============================================================================
// CONTACT PAGE DEFAULTS
// =============================================================================

/**
 * Creates default blocks for the Contact page
 */
export function createContactPageBlocks(): BlockInstance[] {
  const timestamp = Date.now();
  
  return [
    {
      id: `contact-hero-${timestamp}`,
      type: 'hero',
      enabled: true,
      props: {
        headline: 'Contact Us',
        tagline: 'We\'re here to help with any questions or concerns',
        backgroundType: 'gradient',
        gradientFrom: '#5FBFAF',
        gradientTo: '#5F284A',
        gradientDirection: 'to-br',
        alignment: 'center',
      },
    },
    {
      id: `contact-main-${timestamp}`,
      type: 'contact',
      enabled: true,
      props: {
        title: 'Get in Touch',
        subtitle: 'Have questions? We\'d love to hear from you. Reach out through any of the methods below.',
        showPhone: true,
        showEmail: true,
        showAddress: true,
        showHours: true,
        showMap: true,
        layout: 'horizontal',
      },
    },
    {
      id: `contact-locations-${timestamp}`,
      type: 'clinics',
      enabled: true,
      props: {
        title: 'Our Locations',
        subtitle: 'Visit us at any of our convenient locations',
        showMap: false,
        showHours: true,
        showPhone: true,
        layout: 'grid',
      },
    },
    {
      id: `contact-faq-${timestamp}`,
      type: 'faq',
      enabled: true,
      props: {
        title: 'Frequently Asked Questions',
        subtitle: 'Quick answers to common questions',
        items: [
          {
            id: 'faq-1',
            question: 'What are your office hours?',
            answer: 'Our office hours vary by location. Please check the specific location page or call us for the most up-to-date hours. Most locations are open Monday through Friday from 8:00 AM to 5:00 PM.',
          },
          {
            id: 'faq-2',
            question: 'Do I need an appointment?',
            answer: 'While we recommend scheduling an appointment to ensure minimal wait time, we do accept walk-in patients for urgent care needs. For routine visits, please book in advance through our online scheduling system or by calling our office.',
          },
          {
            id: 'faq-3',
            question: 'What insurance do you accept?',
            answer: 'We accept most major insurance plans. Please contact our billing department or check with your insurance provider to confirm coverage. We also offer self-pay options and payment plans for those without insurance.',
          },
          {
            id: 'faq-4',
            question: 'How can I access my medical records?',
            answer: 'You can access your medical records through our patient portal. If you need physical copies, please submit a medical records request to our office. We typically process requests within 3-5 business days.',
          },
          {
            id: 'faq-5',
            question: 'What should I bring to my first appointment?',
            answer: 'Please bring a valid photo ID, your insurance card, a list of current medications, and any relevant medical records from previous healthcare providers. Arriving 15 minutes early will help ensure a smooth check-in process.',
          },
        ],
        layout: 'accordion',
      },
    },
  ];
}

// =============================================================================
// HOME PAGE DEFAULTS
// =============================================================================

/**
 * Creates default blocks for the Home page
 * Note: Home page blocks are also defined in schema.ts createDefaultWebsiteDefinition()
 * This function provides a standalone version for consistency
 */
export function createHomePageBlocks(): BlockInstance[] {
  const timestamp = Date.now();
  
  return [
    {
      id: `hero-${timestamp}`,
      type: 'hero',
      enabled: true,
      props: {
        headline: 'Welcome to Our Clinic',
        tagline: 'Quality healthcare for you and your family',
        primaryCtaText: 'Book Appointment',
        secondaryCtaText: 'Learn More',
        backgroundType: 'gradient',
        gradientFrom: '#5FBFAF',
        gradientTo: '#5F284A',
        gradientDirection: 'to-br',
        alignment: 'center',
      },
    },
    {
      id: `services-${timestamp}`,
      type: 'services',
      enabled: true,
      props: {
        title: 'Our Services',
        subtitle: 'Comprehensive healthcare services for all your needs',
        showDuration: true,
        showDescription: true,
        layout: 'grid',
      },
    },
    {
      id: `care-team-${timestamp}`,
      type: 'care-team',
      enabled: true,
      props: {
        title: 'Meet Our Care Team',
        subtitle: 'Experienced healthcare professionals dedicated to your wellbeing',
        maxProviders: 4,
        showSpecialties: true,
        showCredentials: true,
        showBookButton: true,
        layout: 'grid',
      },
    },
    {
      id: `clinics-${timestamp}`,
      type: 'clinics',
      enabled: true,
      props: {
        title: 'Our Locations',
        subtitle: 'Convenient locations near you',
        showMap: true,
        showHours: true,
        showPhone: true,
        layout: 'grid',
      },
    },
    {
      id: `contact-${timestamp}`,
      type: 'contact',
      enabled: true,
      props: {
        title: 'Contact Us',
        subtitle: 'We\'re here to help',
        showPhone: true,
        showEmail: true,
        showAddress: true,
        showHours: true,
        layout: 'card-grid',
      },
    },
    {
      id: `cta-band-${timestamp}`,
      type: 'cta-band',
      enabled: true,
      props: {
        headline: 'Ready to Get Started?',
        subheadline: 'Book your appointment today',
        primaryCtaText: 'Book Now',
        backgroundColor: 'primary',
      },
    },
  ];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets default blocks for a specific page type
 */
export function getDefaultBlocksForPageType(pageType: string): BlockInstance[] {
  switch (pageType) {
    case 'home':
      return createHomePageBlocks();
    case 'services':
      return createServicesPageBlocks();
    case 'team':
      return createTeamPageBlocks();
    case 'locations':
      return createLocationsPageBlocks();
    case 'contact':
      return createContactPageBlocks();
    default:
      return [];
  }
}

