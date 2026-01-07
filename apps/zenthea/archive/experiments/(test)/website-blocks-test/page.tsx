'use client';

/**
 * Website Blocks Test Page
 * 
 * A deterministic test fixture that renders all website builder blocks
 * with placeholder content. Used by Playwright tests to verify responsive
 * behavior across viewports.
 * 
 * Includes 4 FAQ layout variants: accordion, two-column, split-panel, card-grid
 * 
 * Route: /website-blocks-test
 */

import React from 'react';
import { BlockRenderer } from '@/components/website-blocks/BlockRenderer';
import type { BlockInstance, ThemeConfig } from '@/lib/website-builder/schema';

// =============================================================================
// TEST THEME (Zenthea defaults - using design system brand colors)
// =============================================================================
// Using CSS variable references to comply with color system rules
// These correspond to the design system colors defined in globals.css

const testTheme: ThemeConfig = {
  primaryColor: 'var(--zenthea-teal)',        // #5FBFAF
  secondaryColor: 'var(--zenthea-purple)',    // #5F284A
  accentColor: 'var(--zenthea-coral)',        // #E8927C
  backgroundColor: 'var(--zenthea-cream)',    // #ffffff
  textColor: 'var(--color-text-primary)',     // #1a1a1a
  fontPair: 'inter-system',
  headingSize: 'medium',
  sectionSpacing: 'normal',
  cornerRadius: 'medium',
  buttonStyle: 'solid',
  colorMode: 'light',
};

// =============================================================================
// TEST BLOCKS (All 11 block types with deterministic content)
// =============================================================================

const testBlocks: BlockInstance[] = [
  // 1. Hero Block
  {
    id: 'test-hero',
    type: 'hero',
    enabled: true,
    props: {
      headline: 'Welcome to Our Healthcare Clinic',
      tagline: 'Quality healthcare for you and your family. Book your appointment today.',
      primaryCtaText: 'Book Appointment',
      primaryCtaLink: '/book',
      secondaryCtaText: 'Meet Our Team',
      secondaryCtaLink: '#care-team',
      backgroundType: 'gradient',
      gradientFrom: 'var(--zenthea-teal)',      // Design system teal
      gradientTo: 'var(--zenthea-purple)',      // Design system purple
      gradientDirection: 'to-br',
      backgroundOverlay: 0.4,
      alignment: 'center',
    },
  },

  // 2. Trust Bar Block
  {
    id: 'test-trust-bar',
    type: 'trust-bar',
    enabled: true,
    props: {
      items: [
        { id: '1', type: 'rating', label: '4.9 Rating', value: '500+ Reviews' },
        { id: '2', type: 'accreditation', label: 'HIPAA Compliant' },
        { id: '3', type: 'insurance', label: 'All Major Insurance Accepted' },
        { id: '4', type: 'custom', label: '15+ Years Experience' },
      ],
      layout: 'horizontal',
    },
  },

  // 3. Services Block
  {
    id: 'test-services',
    type: 'services',
    enabled: true,
    props: {
      title: 'Our Services',
      subtitle: 'Comprehensive healthcare services for all your needs',
      showDuration: true,
      showDescription: true,
      layout: 'grid',
      maxServices: 6,
    },
  },

  // 4. Care Team Block
  {
    id: 'test-care-team',
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

  // 5. How It Works Block
  {
    id: 'test-how-it-works',
    type: 'how-it-works',
    enabled: true,
    props: {
      title: 'How It Works',
      subtitle: 'Getting started is easy',
      steps: [
        { id: '1', number: 1, title: 'Book Online', description: 'Schedule your appointment in just a few clicks using our online booking system.' },
        { id: '2', number: 2, title: 'Visit Our Clinic', description: 'Come to your appointment at our modern, welcoming facility.' },
        { id: '3', number: 3, title: 'Receive Quality Care', description: 'Our expert team provides personalized healthcare tailored to your needs.' },
      ],
    },
  },

  // 6. Clinics Block
  {
    id: 'test-clinics',
    type: 'clinics',
    enabled: true,
    props: {
      title: 'Our Locations',
      subtitle: 'Find a clinic near you',
      showMap: true,
      showHours: true,
      showPhone: true,
      layout: 'grid',
    },
  },

  // 7. Testimonials Block
  {
    id: 'test-testimonials',
    type: 'testimonials',
    enabled: true,
    props: {
      title: 'What Our Patients Say',
      subtitle: 'Real stories from real patients',
      testimonials: [
        {
          id: '1',
          quote: 'The staff here is incredibly professional and caring. I felt comfortable from the moment I walked in.',
          authorName: 'Sarah Johnson',
          authorTitle: 'Patient since 2021',
          rating: 5,
        },
        {
          id: '2',
          quote: 'Best healthcare experience I have ever had. The doctors take time to listen and explain everything clearly.',
          authorName: 'Michael Chen',
          authorTitle: 'Patient since 2020',
          rating: 5,
        },
        {
          id: '3',
          quote: 'Online booking is so convenient, and the wait times are minimal. Highly recommend this clinic!',
          authorName: 'Emily Rodriguez',
          authorTitle: 'Patient since 2022',
          rating: 5,
        },
      ],
      layout: 'carousel',
      maxVisible: 3,
    },
  },

  // 8. FAQ Block (Accordion Layout)
  {
    id: 'test-faq',
    type: 'faq',
    enabled: true,
    props: {
      title: 'Frequently Asked Questions',
      subtitle: 'Find answers to common questions',
      items: [
        {
          id: '1',
          question: 'What insurance plans do you accept?',
          answer: 'We accept most major insurance plans including Blue Cross, Aetna, United Healthcare, and Medicare. Please contact our office to verify your specific coverage.',
        },
        {
          id: '2',
          question: 'How do I schedule an appointment?',
          answer: 'You can schedule an appointment online through our website, call our office directly, or use our mobile app. New patients are always welcome.',
        },
        {
          id: '3',
          question: 'What should I bring to my first visit?',
          answer: 'Please bring your insurance card, a valid photo ID, and any relevant medical records or test results. Arriving 15 minutes early helps complete paperwork.',
        },
        {
          id: '4',
          question: 'Do you offer telehealth appointments?',
          answer: 'Yes, we offer telehealth appointments for many types of visits. Ask about virtual consultation options when scheduling.',
        },
      ],
      layout: 'accordion',
    },
  },

  // 8b. FAQ Block (Two-Column Layout)
  {
    id: 'test-faq-two-column',
    type: 'faq',
    enabled: true,
    props: {
      title: 'More Questions (Two Column)',
      subtitle: 'Additional FAQs in two-column layout',
      items: [
        {
          id: '1',
          question: 'Do you accept new patients?',
          answer: 'Yes, we are always accepting new patients! Call our office or use online booking to schedule your first appointment.',
        },
        {
          id: '2',
          question: 'What are your office hours?',
          answer: 'We are open Monday through Friday from 8am to 5pm. Saturday appointments are available by request.',
        },
        {
          id: '3',
          question: 'Is parking available?',
          answer: 'Yes, we have free parking available in our lot adjacent to the building.',
        },
        {
          id: '4',
          question: 'How do I refill my prescription?',
          answer: 'You can request prescription refills through our patient portal or by calling our office during business hours.',
        },
      ],
      layout: 'two-column',
    },
  },

  // 8c. FAQ Block (Split-Panel Layout)
  {
    id: 'test-faq-split-panel',
    type: 'faq',
    enabled: true,
    props: {
      title: 'Patient Resources (Split Panel)',
      subtitle: 'Click a question to see the answer',
      items: [
        {
          id: '1',
          question: 'How do I access my patient portal?',
          answer: 'You can access your patient portal by visiting our website and clicking on "Patient Portal" in the top navigation. Use the credentials you received during registration.',
        },
        {
          id: '2',
          question: 'Can I request medical records online?',
          answer: 'Yes, you can request copies of your medical records through the patient portal. Records are typically available within 3-5 business days.',
        },
        {
          id: '3',
          question: 'What should I do in a medical emergency?',
          answer: 'For life-threatening emergencies, call 911 immediately. For urgent but non-emergency situations, call our after-hours line.',
        },
        {
          id: '4',
          question: 'Do you offer payment plans?',
          answer: 'Yes, we offer flexible payment plans for patients without insurance or with high deductibles. Speak with our billing department for options.',
        },
      ],
      layout: 'split-panel',
    },
  },

  // 8d. FAQ Block (Card Grid Layout)
  {
    id: 'test-faq-card-grid',
    type: 'faq',
    enabled: true,
    props: {
      title: 'Quick Answers (Card Grid)',
      subtitle: 'Browse all FAQs at a glance',
      items: [
        {
          id: '1',
          question: 'Do you have a mobile app?',
          answer: 'Yes! Download our app from the App Store or Google Play to manage appointments and access your health records.',
        },
        {
          id: '2',
          question: 'Is Wi-Fi available?',
          answer: 'Free Wi-Fi is available in our waiting area for all patients.',
        },
        {
          id: '3',
          question: 'Do you offer flu shots?',
          answer: 'Yes, we offer flu vaccinations seasonally. Walk-ins are welcome during flu season.',
        },
        {
          id: '4',
          question: 'Can I bring a family member?',
          answer: 'Absolutely! You are welcome to bring a family member or friend to your appointment.',
        },
        {
          id: '5',
          question: 'Is there wheelchair access?',
          answer: 'Our facility is fully wheelchair accessible with ramps and automatic doors.',
        },
        {
          id: '6',
          question: 'Do you speak other languages?',
          answer: 'We have staff members who speak Spanish and Mandarin. Interpreter services are available for other languages.',
        },
      ],
      layout: 'card-grid',
    },
  },

  // 9. Contact Block
  {
    id: 'test-contact',
    type: 'contact',
    enabled: true,
    props: {
      title: 'Contact Us',
      subtitle: 'We are here to help',
      showPhone: true,
      showEmail: true,
      showAddress: true,
      showHours: true,
      showMap: false,
      layout: 'card-grid',
    },
  },

  // 10. CTA Band Block
  {
    id: 'test-cta-band',
    type: 'cta-band',
    enabled: true,
    props: {
      headline: 'Ready to Get Started?',
      subheadline: 'Book your appointment today and experience the difference.',
      primaryCtaText: 'Book Now',
      primaryCtaLink: '/book',
      secondaryCtaText: 'Contact Us',
      secondaryCtaLink: '#contact',
      backgroundColor: 'primary',
    },
  },

  // 11. Custom Text Block
  {
    id: 'test-custom-text',
    type: 'custom-text',
    enabled: true,
    props: {
      title: 'About Our Practice',
      content: `
        <p>Founded in 2010, our practice has been serving the community with compassionate, patient-centered healthcare. Our team of experienced physicians and healthcare professionals is dedicated to providing the highest quality care.</p>
        <p>We believe in treating the whole person, not just symptoms. Our approach combines evidence-based medicine with a genuine commitment to understanding each patient's unique needs and goals.</p>
        <h3>Our Mission</h3>
        <p>To provide accessible, high-quality healthcare that empowers patients to live their healthiest lives.</p>
      `,
      alignment: 'left',
      showTitle: true,
      backgroundColor: 'var(--zenthea-cream)',        // Design system background
      textColor: 'var(--color-text-primary)',         // Design system text color
      maxWidth: 'normal',
    },
  },
];

// =============================================================================
// TEST PAGE COMPONENT
// =============================================================================

export default function WebsiteBlocksTestPage() {
  return (
    <div 
      className="min-h-screen bg-background-primary"
      data-testid="website-blocks-test-page"
    >
      {/* Test header for identification */}
      <header 
        className="bg-surface-elevated border-b border-border-primary px-4 py-2"
        data-testid="test-page-header"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-sm font-medium text-text-secondary">
            Website Blocks Test Fixture
          </span>
          <span className="text-xs text-text-tertiary">
            {testBlocks.length} blocks rendered
          </span>
        </div>
      </header>

      {/* Main content - renders all blocks */}
      <main data-testid="blocks-container">
        {testBlocks.map((block) => (
          <section
            key={block.id}
            data-testid={`block-${block.type}`}
            data-block-id={block.id}
            data-block-type={block.type}
          >
            <BlockRenderer
              block={block}
              tenantId="test-tenant-id"
              isPreview={false}
              theme={testTheme}
              bookUrl="/book"
            />
          </section>
        ))}
      </main>

      {/* Test footer */}
      <footer 
        className="bg-surface-elevated border-t border-border-primary px-4 py-4"
        data-testid="test-page-footer"
      >
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-text-tertiary">
            End of test blocks
          </p>
        </div>
      </footer>
    </div>
  );
}

