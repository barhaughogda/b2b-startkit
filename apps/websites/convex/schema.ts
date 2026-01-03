import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { permissionTreeValidator } from './validators'

// Background design system values
const backgroundTokenValidator = v.union(
  v.literal('default'),
  v.literal('primary'),
  v.literal('secondary'),
  v.literal('surface'),
  v.literal('accent'),
  v.literal('accent-light'),
  v.literal('transparent')
)

// Text color design system values
const textTokenValidator = v.union(
  v.literal('default'),
  v.literal('primary'),
  v.literal('secondary'),
  v.literal('tertiary'),
  v.literal('on-accent'),
  v.literal('accent')
)

// Block appearance configuration
const blockAppearanceValidator = v.object({
  backgroundColor: v.optional(v.string()),
  backgroundToken: backgroundTokenValidator,
  backgroundCustom: v.optional(v.string()),
  textColor: v.optional(v.string()),
  textToken: textTokenValidator,
  textCustom: v.optional(v.string()),
  paddingTop: v.optional(
    v.union(
      v.literal('none'),
      v.literal('small'),
      v.literal('medium'),
      v.literal('large')
    )
  ),
  paddingBottom: v.optional(
    v.union(
      v.literal('none'),
      v.literal('small'),
      v.literal('medium'),
      v.literal('large')
    )
  ),
  maxWidth: v.optional(
    v.union(
      v.literal('narrow'),
      v.literal('normal'),
      v.literal('wide'),
      v.literal('full')
    )
  ),
  borderTop: v.optional(v.boolean()),
  borderBottom: v.optional(v.boolean()),
})

export default defineSchema({
  tenants: defineTable({
    id: v.string(), // Custom tenant ID (e.g., "clinic-123")
    name: v.string(),
    slug: v.optional(v.string()), // URL-safe identifier for public pages (e.g., "acme-health")
    tagline: v.optional(v.string()), // Short tagline for landing page
    description: v.optional(v.string()), // Description for landing page and SEO
    type: v.union(
      v.literal('clinic'),
      v.literal('hospital'),
      v.literal('practice'),
      v.literal('group')
    ),
    status: v.union(
      v.literal('active'),
      v.literal('inactive'),
      v.literal('suspended'),
      v.literal('trial')
    ),
    subscription: v.object({
      plan: v.union(
        v.literal('demo'),
        v.literal('basic'),
        v.literal('premium'),
        v.literal('enterprise')
      ),
      status: v.union(
        v.literal('active'),
        v.literal('cancelled'),
        v.literal('expired')
      ),
      startDate: v.string(),
      endDate: v.optional(v.string()),
      maxUsers: v.number(),
      maxPatients: v.number(),
    }),
    branding: v.object({
      logo: v.optional(v.string()),
      primaryColor: v.string(),
      secondaryColor: v.string(),
      accentColor: v.optional(v.string()),
      customDomain: v.optional(v.string()), // Deprecated: Use domains.customDomain instead
      favicon: v.optional(v.string()),
      customCss: v.optional(v.string()),
    }),
    // Domain configuration for multi-tenant access
    domains: v.optional(
      v.object({
        subdomain: v.optional(v.string()), // e.g., "acme-health" -> acme-health.zenthea.ai
        customDomain: v.optional(v.string()), // e.g., "portal.acmehealth.com"
        customDomainVerified: v.optional(v.boolean()), // Whether custom domain DNS is verified
        customDomainVerifiedAt: v.optional(v.number()), // Timestamp of verification
        preferredAccess: v.optional(
          v.union(
            v.literal('path'), // zenthea.ai/clinic/acme-health
            v.literal('subdomain'), // acme-health.zenthea.ai
            v.literal('custom') // portal.acmehealth.com
          )
        ),
      })
    ),
    // Landing page configuration
    landingPage: v.optional(
      v.object({
        enabled: v.optional(v.boolean()), // Whether public landing page is active
        heroTitle: v.optional(v.string()), // Main headline
        heroSubtitle: v.optional(v.string()), // Subtitle/description
        heroImage: v.optional(v.string()), // Hero background image URL
        heroCtaText: v.optional(v.string()), // CTA button text (e.g., "Book Now")
        heroCtaLink: v.optional(v.string()), // CTA button link
        showBooking: v.optional(v.boolean()), // Show booking section
        showCareTeam: v.optional(v.boolean()), // Show care team/providers section
        showClinics: v.optional(v.boolean()), // Show clinic locations section
        showTestimonials: v.optional(v.boolean()), // Show testimonials section
        showServices: v.optional(v.boolean()), // Show services section
        customSections: v.optional(
          v.array(
            v.object({
              id: v.string(),
              title: v.string(),
              content: v.string(),
              order: v.number(),
              enabled: v.boolean(),
            })
          )
        ),
        sectionOrder: v.optional(v.array(v.string())), // Order of sections: ["hero", "services", "careTeam", "clinics", "booking", "testimonials"]
      })
    ),
    // Website Builder configuration (new builder system)
    websiteBuilder: v.optional(
      v.object({
        // Schema version for migrations
        version: v.string(),
        // Site structure type (one-pager vs multi-page)
        siteStructure: v.optional(
          v.union(v.literal('one-pager'), v.literal('multi-page'))
        ),
        // Template selection
        templateId: v.union(
          v.literal('classic-stacked'),
          v.literal('bento-grid'),
          v.literal('split-hero'),
          v.literal('multi-location'),
          v.literal('team-forward')
        ),
        // Header configuration
        header: v.object({
          variant: v.union(
            v.literal('sticky-simple'),
            v.literal('centered'),
            v.literal('info-bar')
          ),
          logoUrl: v.optional(v.string()),
          logoAlt: v.optional(v.string()),
          navItems: v.array(
            v.object({
              id: v.string(),
              label: v.string(),
              href: v.string(),
              isExternal: v.optional(v.boolean()),
              pageId: v.optional(v.string()),
            })
          ),
          showSignIn: v.boolean(),
          signInText: v.string(),
          signInUrl: v.string(),
          showBook: v.boolean(),
          bookText: v.string(),
          bookUrl: v.string(),
          infoBarPhone: v.optional(v.string()),
          infoBarHours: v.optional(v.string()),
          infoBarText: v.optional(v.string()),
          sticky: v.boolean(),
          transparent: v.boolean(),
          // Navigation color customization
          backgroundColor: v.optional(v.string()), // Primary name for frontend
          textColor: v.optional(v.string()),
          mobileBackgroundColor: v.optional(v.string()),
          mobileTextColor: v.optional(v.string()),
          headerBackgroundColor: v.optional(v.string()), // Legacy/Secondary names
          headerTextColor: v.optional(v.string()),
          headerMobileBackgroundColor: v.optional(v.string()),
          headerMobileTextColor: v.optional(v.string()),
          useThemeColors: v.optional(v.boolean()), // Toggle to use global theme colors instead of custom
        }),
        // Footer configuration
        footer: v.object({
          variant: v.union(v.literal('multi-column'), v.literal('minimal')),
          columns: v.array(
            v.object({
              id: v.string(),
              title: v.string(),
              links: v.array(
                v.object({
                  id: v.string(),
                  label: v.string(),
                  href: v.string(),
                  isExternal: v.optional(v.boolean()),
                })
              ),
            })
          ),
          // V2 menu columns with sections (optional)
          menuColumns: v.optional(
            v.array(
              v.object({
                id: v.string(),
                layoutOrder: v.number(),
                sections: v.array(
                  v.object({
                    id: v.string(),
                    title: v.string(),
                    items: v.array(
                      v.union(
                        v.object({
                          id: v.string(),
                          kind: v.literal('page'),
                          pageId: v.string(),
                        }),
                        v.object({
                          id: v.string(),
                          kind: v.literal('external'),
                          label: v.string(),
                          url: v.string(),
                          openInNewTab: v.optional(v.boolean()),
                        })
                      )
                    ),
                  })
                ),
              })
            )
          ),
          showLogo: v.boolean(),
          tagline: v.optional(v.string()),
          showSocial: v.boolean(),
          socialLinks: v.array(
            v.object({
              id: v.string(),
              platform: v.union(
                v.literal('facebook'),
                v.literal('twitter'),
                v.literal('instagram'),
                v.literal('linkedin'),
                v.literal('youtube'),
                v.literal('tiktok')
              ),
              url: v.string(),
              enabled: v.optional(v.boolean()),
            })
          ),
          // External links for footer (links to external websites)
          externalLinks: v.optional(
            v.array(
              v.object({
                id: v.string(),
                label: v.string(),
                url: v.string(),
                openInNewTab: v.optional(v.boolean()),
              })
            )
          ),
          showNewsletter: v.boolean(),
          newsletterTitle: v.optional(v.string()),
          legalLinks: v.array(
            v.object({
              id: v.string(),
              label: v.string(),
              href: v.string(),
            })
          ),
          copyrightText: v.optional(v.string()),
          poweredByZenthea: v.boolean(),
          // Navigation color customization
          backgroundColor: v.optional(v.string()), // Primary name for frontend
          textColor: v.optional(v.string()),
          footerBackgroundColor: v.optional(v.string()), // Legacy/Secondary names
          footerTextColor: v.optional(v.string()),
          useThemeColors: v.optional(v.boolean()), // Toggle to use global theme colors instead of custom
        }),
        // Theme configuration
        theme: v.object({
          primaryColor: v.string(),
          secondaryColor: v.string(),
          accentColor: v.string(),
          backgroundColor: v.string(),
          textColor: v.string(),
          fontPair: v.string(),
          headingSize: v.union(
            v.literal('small'),
            v.literal('medium'),
            v.literal('large')
          ),
          sectionSpacing: v.union(
            v.literal('compact'),
            v.literal('normal'),
            v.literal('spacious')
          ),
          cornerRadius: v.union(
            v.literal('none'),
            v.literal('small'),
            v.literal('medium'),
            v.literal('large'),
            v.literal('full')
          ),
          buttonStyle: v.union(
            v.literal('solid'),
            v.literal('outline'),
            v.literal('ghost')
          ),
          colorMode: v.union(
            v.literal('light'),
            v.literal('dark'),
            v.literal('auto')
          ),
          customCss: v.optional(v.string()),
        }),
        // Blocks configuration (stored as flexible JSON) - for home page, backwards compatible
        blocks: v.array(
          v.object({
            id: v.string(),
            type: v.union(
              v.literal('hero'),
              v.literal('care-team'),
              v.literal('clinics'),
              v.literal('services'),
              v.literal('trust-bar'),
              v.literal('how-it-works'),
              v.literal('testimonials'),
              v.literal('faq'),
              v.literal('contact'),
              v.literal('cta-band'),
              v.literal('custom-text'),
              v.literal('photo-text'),
              v.literal('media')
            ),
            props: v.any(), // Block-specific props stored as JSON
            enabled: v.boolean(),
            appearance: v.optional(blockAppearanceValidator),
          })
        ),
        // Pages configuration (new multi-page support)
        pages: v.optional(
          v.array(
            v.object({
              id: v.string(),
              type: v.union(
                v.literal('home'),
                v.literal('services'),
                v.literal('team'),
                v.literal('locations'),
                v.literal('contact'),
                v.literal('custom'),
                v.literal('terms'),
                v.literal('privacy')
              ),
              title: v.string(),
              slug: v.string(),
              enabled: v.boolean(),
              showInHeader: v.boolean(),
              showInFooter: v.boolean(),
              blocks: v.array(
                v.object({
                  id: v.string(),
                  type: v.union(
                    v.literal('hero'),
                    v.literal('care-team'),
                    v.literal('clinics'),
                    v.literal('services'),
                    v.literal('trust-bar'),
                    v.literal('how-it-works'),
                    v.literal('testimonials'),
                    v.literal('faq'),
                    v.literal('contact'),
                    v.literal('cta-band'),
                    v.literal('custom-text'),
                    v.literal('photo-text'),
                    v.literal('media')
                  ),
                  props: v.any(),
                  enabled: v.boolean(),
                  appearance: v.optional(blockAppearanceValidator),
                })
              ),
              order: v.number(),
              useDefaultContent: v.optional(v.boolean()),
            })
          )
        ),
        // Active page being edited (for builder state)
        activePageId: v.optional(v.string()),
        // SEO configuration
        seo: v.object({
          title: v.optional(v.string()),
          description: v.optional(v.string()),
          keywords: v.optional(v.array(v.string())),
          ogImage: v.optional(v.string()),
          ogTitle: v.optional(v.string()),
          ogDescription: v.optional(v.string()),
          twitterCard: v.optional(
            v.union(v.literal('summary'), v.literal('summary_large_image'))
          ),
          canonicalUrl: v.optional(v.string()),
          noIndex: v.optional(v.boolean()),
        }),
        // Metadata
        publishedAt: v.optional(v.number()),
        lastEditedAt: v.number(),
        lastEditedBy: v.optional(v.string()),
      })
    ),
    // Public booking configuration
    bookingSettings: v.optional(
      v.object({
        mode: v.optional(
          v.union(
            v.literal('full'), // Direct booking - patients can book directly
            v.literal('request'), // Request only - patients submit request, clinic confirms
            v.literal('account_required'), // Must login/create account before booking
            v.literal('disabled') // No public booking
          )
        ),
        requirePhone: v.optional(v.boolean()), // Phone required for booking
        requireInsurance: v.optional(v.boolean()), // Insurance info required
        requireDateOfBirth: v.optional(v.boolean()), // DOB required
        advanceBookingDays: v.optional(v.number()), // How many days in advance can book (e.g., 30)
        minimumNoticeHours: v.optional(v.number()), // Minimum hours before appointment (e.g., 24)
        appointmentTypes: v.optional(
          v.array(
            v.object({
              id: v.string(),
              name: v.string(),
              duration: v.number(), // Duration in minutes
              description: v.optional(v.string()),
              enabled: v.boolean(),
              allowOnline: v.optional(v.boolean()), // Can be booked online
              // Legacy price field (cents) - kept for backward compatibility
              // New code should use pricing.amountCents or pricing.minCents/maxCents
              price: v.optional(v.number()),
              // Flexible pricing configuration
              pricing: v.optional(
                v.object({
                  mode: v.union(
                    v.literal('hidden'),   // Price not shown
                    v.literal('free'),     // Free service
                    v.literal('fixed'),    // Single fixed price
                    v.literal('from'),     // "From $X" (minimum price)
                    v.literal('range')     // Price range "$X - $Y"
                  ),
                  currency: v.optional(v.string()), // ISO 4217 code (defaults to tenant currency)
                  amountCents: v.optional(v.number()), // For fixed/from modes
                  minCents: v.optional(v.number()), // For range mode
                  maxCents: v.optional(v.number()), // For range mode
                })
              ),
              // Icon configuration
              icon: v.optional(
                v.union(
                  v.object({
                    kind: v.literal('lucide'),
                    name: v.string(), // Lucide icon name (e.g., "Stethoscope", "Heart")
                  }),
                  v.object({
                    kind: v.literal('customSvg'),
                    url: v.string(), // URL to uploaded SVG file
                  })
                )
              ),
            })
          )
        ),
        welcomeMessage: v.optional(v.string()), // Message shown on booking page
        confirmationMessage: v.optional(v.string()), // Message shown after booking
      })
    ),
    contactInfo: v.object({
      phone: v.string(),
      email: v.string(),
      address: v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zipCode: v.string(),
        country: v.string(),
      }),
      website: v.optional(v.string()),
    }),
    features: v.object({
      onlineScheduling: v.boolean(),
      telehealth: v.boolean(),
      prescriptionRefills: v.boolean(),
      labResults: v.boolean(),
      messaging: v.boolean(),
      billing: v.boolean(),
      patientPortal: v.boolean(),
      mobileApp: v.boolean(),
    }),
    settings: v.object({
      timezone: v.string(),
      dateFormat: v.string(),
      timeFormat: v.string(),
      currency: v.string(),
      language: v.string(),
      appointmentDuration: v.number(),
      passwordRotationPeriod: v.optional(v.number()), // Password rotation period in days (e.g., 90 for 90 days). If not set, password rotation is disabled.
      passwordHistoryLength: v.optional(v.number()), // Number of previous passwords to track (default: 5). If not set, password history tracking is disabled.
      accountLockoutMaxAttempts: v.optional(v.number()), // Maximum failed login attempts before lockout (default: 5). If not set, account lockout is disabled.
      accountLockoutDuration: v.optional(v.number()), // Lockout duration in minutes (default: 30). If not set, uses default 30 minutes.
      sessionTimeout: v.optional(
        v.object({
          timeout: v.optional(v.number()), // Session timeout in minutes (default: 30). Must be between 5 and 480 minutes.
          warningTime: v.optional(v.number()), // Warning time in minutes before logout (default: 2). Must be less than timeout.
          enabled: v.optional(v.boolean()), // Whether session timeout is enabled (default: true).
          maxConcurrentSessions: v.optional(v.number()), // Maximum concurrent sessions per user (default: 3). Must be between 1 and 10.
        })
      ),
      reminderSettings: v.object({
        email: v.boolean(),
        sms: v.boolean(),
        phone: v.boolean(),
        advanceNoticeHours: v.number(),
      }),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_tenant_id', ['id'])
    .index('by_slug', ['slug'])
    .index('by_subdomain', ['domains.subdomain'])
    .index('by_custom_domain', ['domains.customDomain'])
    .index('by_status', ['status'])
    .index('by_subscription_plan', ['subscription.plan'])
    .index('by_type', ['type']),

  users: defineTable({
    email: v.string(),
    name: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    role: v.union(
      v.literal('admin'),
      v.literal('provider'),
      v.literal('clinic_user'), // New unified clinic role (replaces admin/provider in Phase 4)
      v.literal('demo'),
      v.literal('patient'),
      v.literal('super_admin')
    ),
    passwordHash: v.string(),
    isActive: v.boolean(),
    isOwner: v.optional(v.boolean()), // Clinic ownership flag - defaults to false for existing users
    clinics: v.optional(v.array(v.string())), // Array of clinic IDs - defaults to empty array for existing users
    departments: v.optional(v.array(v.string())), // Array of department IDs - defaults to empty array for existing users
    customRoleId: v.optional(v.id('customRoles')), // Reference to custom role - optional, null if user has no custom role assigned
    mfaSettings: v.optional(
      v.object({
        enabled: v.boolean(), // Whether MFA is enabled for this user
        method: v.optional(v.union(v.literal('totp'), v.literal('sms'))), // MFA method: TOTP (Time-based One-Time Password) or SMS
        secret: v.optional(v.string()), // Encrypted TOTP secret (encrypted at rest using AES-256-GCM)
        backupCodes: v.optional(v.array(v.string())), // Array of hashed backup codes (one-way hashed using bcrypt)
        setupCompletedAt: v.optional(v.number()), // Timestamp when MFA setup was completed
        lastVerifiedAt: v.optional(v.number()), // Timestamp of last successful MFA verification
      })
    ),
    lastPasswordChange: v.optional(v.number()), // Timestamp of last password change for password rotation tracking
    passwordHistory: v.optional(
      v.array(
        v.object({
          hash: v.string(), // Hashed password (bcrypt hash)
          changedAt: v.number(), // Timestamp when password was changed
        })
      )
    ), // Array of previous password hashes to prevent reuse
    failedLoginAttempts: v.optional(v.number()), // Number of consecutive failed login attempts (default: 0)
    accountLockedUntil: v.optional(v.number()), // Timestamp when account lockout expires (null if not locked)
    lastFailedLoginAttempt: v.optional(v.number()), // Timestamp of last failed login attempt
    lastLogin: v.optional(v.number()),
    tenantId: v.optional(v.string()), // For multi-tenancy support
    timezone: v.optional(v.string()), // User's personal timezone (IANA format, e.g., "America/New_York"). If not set, inherits from clinic/company.
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_role', ['role'])
    .index('by_tenant', ['tenantId'])
    .index('by_email_tenant', ['email', 'tenantId'])
    .index('by_last_password_change', ['lastPasswordChange']),

  patients: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.number(),

    // Demographics & Personal Information
    preferredName: v.optional(v.string()),
    gender: v.optional(v.string()),
    genderIdentity: v.optional(v.string()),
    preferredPronouns: v.optional(v.string()),
    maritalStatus: v.optional(v.string()),
    occupation: v.optional(v.string()),
    primaryLanguage: v.optional(v.string()),
    race: v.optional(v.string()),
    ethnicity: v.optional(v.string()),

    // Contact Information (existing + extended)
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    cellPhone: v.optional(v.string()),
    workPhone: v.optional(v.string()),
    address: v.optional(
      v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zipCode: v.string(),
      })
    ),

    // Medical History
    medicalHistory: v.optional(
      v.object({
        chronicConditions: v.array(
          v.object({
            condition: v.string(),
            diagnosisDate: v.string(),
            status: v.string(), // active, resolved, in-remission
            notes: v.optional(v.string()),
          })
        ),
        surgeries: v.array(
          v.object({
            procedure: v.string(),
            date: v.string(),
            hospital: v.optional(v.string()),
            notes: v.optional(v.string()),
          })
        ),
        hospitalizations: v.array(
          v.object({
            reason: v.string(),
            admissionDate: v.string(),
            dischargeDate: v.string(),
            hospital: v.optional(v.string()),
            notes: v.optional(v.string()),
          })
        ),
      })
    ),

    // Allergies & Adverse Reactions
    allergies: v.optional(
      v.object({
        medications: v.array(
          v.object({
            substance: v.string(),
            reactionType: v.string(),
            severity: v.string(), // mild, moderate, severe, life-threatening
            symptoms: v.string(),
            dateIdentified: v.optional(v.string()),
          })
        ),
        foods: v.array(
          v.object({
            food: v.string(),
            reactionType: v.string(),
            severity: v.string(),
            symptoms: v.string(),
          })
        ),
        environmental: v.array(
          v.object({
            allergen: v.string(),
            reactionType: v.string(),
            severity: v.string(),
            symptoms: v.string(),
          })
        ),
        other: v.array(
          v.object({
            substance: v.string(),
            reactionType: v.string(),
            severity: v.string(),
            symptoms: v.string(),
          })
        ),
      })
    ),

    // Current Medications
    medications: v.optional(
      v.array(
        v.object({
          name: v.string(),
          dosage: v.string(),
          frequency: v.string(),
          route: v.string(), // oral, topical, injection, etc.
          prescribedBy: v.optional(v.string()),
          startDate: v.string(),
          indication: v.optional(v.string()),
          notes: v.optional(v.string()),
        })
      )
    ),

    // Emergency Contacts
    emergencyContacts: v.optional(
      v.array(
        v.object({
          name: v.string(),
          relationship: v.string(),
          phone: v.string(),
          email: v.optional(v.string()),
          isPrimary: v.boolean(),
        })
      )
    ),

    // Healthcare Proxy
    healthcareProxy: v.optional(
      v.object({
        name: v.string(),
        relationship: v.string(),
        phone: v.string(),
        email: v.optional(v.string()),
        documentOnFile: v.boolean(),
      })
    ),

    // Insurance (existing + extended)
    insurance: v.optional(
      v.object({
        primary: v.optional(
          v.object({
            provider: v.string(),
            policyNumber: v.string(),
            groupNumber: v.optional(v.string()),
            subscriberName: v.string(),
            subscriberDOB: v.optional(v.string()),
            effectiveDate: v.string(),
            employerName: v.optional(v.string()),
          })
        ),
        secondary: v.optional(
          v.object({
            provider: v.string(),
            policyNumber: v.string(),
            groupNumber: v.optional(v.string()),
            subscriberName: v.string(),
          })
        ),
        // Legacy fields for backward compatibility
        provider: v.optional(v.string()),
        policyNumber: v.optional(v.string()),
        groupNumber: v.optional(v.string()),
      })
    ),

    // Lifestyle Factors
    lifestyle: v.optional(
      v.object({
        smokingStatus: v.string(), // never, former, current
        smokingHistory: v.optional(
          v.object({
            packsPerDay: v.optional(v.number()),
            yearsSmoked: v.optional(v.number()),
            quitDate: v.optional(v.string()),
          })
        ),
        alcoholUse: v.string(), // none, occasional, moderate, heavy
        alcoholDetails: v.optional(v.string()),
        exerciseFrequency: v.string(),
        exerciseTypes: v.optional(v.array(v.string())),
        dietaryPatterns: v.optional(v.array(v.string())), // vegetarian, vegan, kosher, etc.
        occupationalExposures: v.optional(v.string()),
      })
    ),

    // Family Medical History
    familyHistory: v.optional(
      v.array(
        v.object({
          relationship: v.string(), // mother, father, sibling, etc.
          condition: v.string(),
          ageAtDiagnosis: v.optional(v.number()),
          currentAge: v.optional(v.number()),
          deceased: v.boolean(),
          notes: v.optional(v.string()),
        })
      )
    ),

    // Immunization Records
    immunizations: v.optional(
      v.array(
        v.object({
          vaccine: v.string(),
          dateAdministered: v.string(),
          lotNumber: v.optional(v.string()),
          administeredBy: v.optional(v.string()),
          location: v.optional(v.string()),
          notes: v.optional(v.string()),
        })
      )
    ),

    // Advance Directives
    advanceDirectives: v.optional(
      v.object({
        hasLivingWill: v.boolean(),
        livingWillDate: v.optional(v.string()),
        hasDNR: v.boolean(),
        dnrDate: v.optional(v.string()),
        hasPOLST: v.boolean(),
        polstDate: v.optional(v.string()),
        organDonor: v.optional(v.boolean()),
        advanceDirectivesOnFile: v.boolean(),
        notes: v.optional(v.string()),
      })
    ),

    // Social Determinants of Health
    socialDeterminants: v.optional(
      v.object({
        housingStatus: v.optional(v.string()),
        foodSecurity: v.optional(v.string()),
        transportationAccess: v.optional(v.string()),
        financialStrain: v.optional(v.string()),
      })
    ),

    // Medical Bio (patient narrative)
    medicalBio: v.optional(v.string()),

    // Profile Photo
    avatar: v.optional(v.string()), // URL to patient profile photo

    // Profile Completeness Tracking
    profileCompleteness: v.optional(
      v.object({
        lastUpdated: v.number(),
        sectionsCompleted: v.array(v.string()),
      })
    ),

    // Primary Provider - Accountable provider responsible for this patient's care
    // This is the single provider who owns the patient relationship within this tenant
    primaryProviderId: v.optional(v.id('users')),

    // Patient Preferences for Booking
    // Preferred clinic for scheduling appointments (canonical field)
    preferredClinicId: v.optional(v.id('clinics')),
    // DEPRECATED: Use preferredClinicId instead. Kept for migration.
    preferredLocationId: v.optional(v.id('locations')),
    
    // Patient Preferences for Display
    // Personal timezone preference (IANA format, e.g., "America/New_York")
    // Auto-detected from address on creation, can be overridden in settings
    timezone: v.optional(v.string()),

    tenantId: v.string(), // Required for tenant isolation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_name', ['firstName', 'lastName'])
    .index('by_email', ['email'])
    .index('by_phone', ['phone'])
    .index('by_tenant', ['tenantId'])
    .index('by_email_tenant', ['email', 'tenantId'])
    .index('by_primary_provider', ['primaryProviderId'])
    .index('by_tenant_primary_provider', ['tenantId', 'primaryProviderId']),

  providers: defineTable({
    firstName: v.string(),
    lastName: v.string(),
    specialty: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    licenseNumber: v.string(),
    npi: v.string(),
    tenantId: v.string(), // Required for tenant isolation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_specialty', ['specialty'])
    .index('by_npi', ['npi'])
    .index('by_tenant', ['tenantId'])
    .index('by_email_tenant', ['email', 'tenantId']),

  appointments: defineTable({
    patientId: v.id('patients'),
    userId: v.optional(v.id('users')), // User who owns the appointment (temporarily optional for migration - will be required after data migration)
    providerId: v.optional(v.id('providers')), // Optional - kept for backward compatibility and provider profiles
    scheduledAt: v.number(),
    duration: v.number(),
    type: v.union(
      v.literal('consultation'),
      v.literal('follow-up'),
      v.literal('procedure'),
      v.literal('emergency')
    ),
    status: v.union(
      v.literal('scheduled'),
      v.literal('confirmed'),
      v.literal('in-progress'),
      v.literal('completed'),
      v.literal('cancelled')
    ),
    notes: v.optional(v.string()),
    locationId: v.optional(v.id('locations')), // DEPRECATED: Use clinicId instead. Kept for migration.
    clinicId: v.optional(v.id('clinics')), // Clinic where appointment takes place (preferred over locationId)
    createdBy: v.optional(v.id('users')), // User who created the appointment (optional for backward compatibility)
    lastModifiedBy: v.optional(v.id('users')), // User who last modified the appointment
    googleCalendarEventId: v.optional(v.string()), // Google Calendar event ID for sync tracking
    tenantId: v.string(), // Required for tenant isolation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_patient', ['patientId'])
    .index('by_patient_date', ['patientId', 'scheduledAt']) // Composite index for efficient patient+date conflict checking
    .index('by_provider', ['providerId'])
    .index('by_user', ['userId'])
    .index('by_scheduled_at', ['scheduledAt'])
    .index('by_status', ['status'])
    .index('by_tenant', ['tenantId'])
    .index('by_location', ['locationId'])
    .index('by_clinic', ['clinicId'])
    .index('by_created_by', ['createdBy'])
    .index('by_provider_date', ['providerId', 'scheduledAt'])
    .index('by_user_date', ['userId', 'scheduledAt'])
    .index('by_tenant_clinic', ['tenantId', 'clinicId']),

  /**
   * Appointment Members - tracks users invited to appointments
   * Users in this table will see the appointment on their calendar
   */
  appointmentMembers: defineTable({
    appointmentId: v.id('appointments'),
    userId: v.id('users'),
    role: v.union(
      v.literal('organizer'), // The person who created the appointment
      v.literal('attendee'), // Required participants
      v.literal('optional') // Optional participants
    ),
    status: v.union(
      v.literal('pending'), // Not yet responded
      v.literal('accepted'), // Accepted the invite
      v.literal('declined'), // Declined the invite
      v.literal('tentative') // Might attend
    ),
    addedBy: v.id('users'),
    tenantId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_appointment', ['appointmentId'])
    .index('by_user', ['userId'])
    .index('by_tenant', ['tenantId'])
    .index('by_user_tenant', ['userId', 'tenantId'])
    .index('by_appointment_user', ['appointmentId', 'userId']),

  /**
   * Slot Locks - optimistic locking for appointment slots
   * Prevents double-booking race conditions during the booking process
   * Locks automatically expire after a configurable timeout (default: 5 minutes)
   */
  slotLocks: defineTable({
    userId: v.id('users'), // Provider whose slot is being locked
    clinicId: v.optional(v.id('clinics')), // Optional clinic for clinic-based availability
    slotStart: v.number(), // UTC timestamp of slot start time
    slotEnd: v.number(), // UTC timestamp of slot end time
    lockedBy: v.optional(v.id('patients')), // Patient who holds the lock (null for anonymous)
    sessionId: v.string(), // Browser session ID for anonymous users
    expiresAt: v.number(), // UTC timestamp when lock expires (auto-cleanup)
    tenantId: v.string(),
    createdAt: v.number(),
  })
    .index('by_user_slot', ['userId', 'slotStart']) // Find locks for a specific user's slot
    .index('by_clinic_slot', ['clinicId', 'slotStart']) // Find locks by clinic
    .index('by_session', ['sessionId']) // Find locks by browser session
    .index('by_expires', ['expiresAt']) // For cleanup of expired locks
    .index('by_tenant', ['tenantId']),

  /**
   * Notifications - in-app notifications for various events
   */
  notifications: defineTable({
    userId: v.id('users'), // User who should receive the notification
    type: v.union(
      v.literal('appointment_invite'), // Invited to an appointment
      v.literal('appointment_update'), // Appointment was updated
      v.literal('appointment_cancelled'), // Appointment was cancelled
      v.literal('appointment_reminder'), // Reminder for upcoming appointment
      v.literal('member_added'), // Added to care team/appointment
      v.literal('member_removed'), // Removed from care team/appointment
      v.literal('message_received'), // New message received
      v.literal('task_assigned'), // Task was assigned
      v.literal('system') // System notification
    ),
    title: v.string(),
    message: v.string(),
    resourceType: v.optional(v.string()), // Type of resource: "appointment", "message", etc.
    resourceId: v.optional(v.string()), // ID of the related resource
    metadata: v.optional(v.any()), // Additional data (e.g., appointment details)
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    tenantId: v.string(),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()), // Optional expiration time
  })
    .index('by_user', ['userId'])
    .index('by_user_tenant', ['userId', 'tenantId'])
    .index('by_user_unread', ['userId', 'isRead'])
    .index('by_tenant', ['tenantId'])
    .index('by_type', ['type']),

  medicalRecords: defineTable({
    patientId: v.id('patients'),
    providerId: v.id('providers'),
    appointmentId: v.optional(v.id('appointments')),
    recordType: v.string(), // 'vitals', 'lab_result', 'medication', 'allergy', 'visit_summary'
    title: v.string(),
    description: v.optional(v.string()),
    data: v.optional(v.any()), // Flexible JSON structure for different record types
    dateRecorded: v.string(), // ISO date string
    status: v.string(), // 'active', 'inactive', 'archived'
    isConfidential: v.boolean(),
    tags: v.optional(v.array(v.string())),
    attachments: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          type: v.string(),
          size: v.number(),
          url: v.string(),
        })
      )
    ),
    notes: v.optional(v.string()),
    tenantId: v.string(), // Required for tenant isolation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_patient', ['patientId'])
    .index('by_provider', ['providerId'])
    .index('by_appointment', ['appointmentId'])
    .index('by_tenant', ['tenantId'])
    .index('by_tenant_patient', ['tenantId', 'patientId'])
    .index('by_tenant_type', ['tenantId', 'recordType'])
    .index('by_patient_type', ['patientId', 'recordType'])
    .index('by_date', ['dateRecorded']),

  messages: defineTable({
    tenantId: v.optional(v.string()), // Temporarily optional for data migration
    fromUserId: v.optional(v.id('users')), // Temporarily optional for data migration
    toUserId: v.optional(v.id('users')), // Temporarily optional for data migration
    subject: v.optional(v.string()),
    content: v.optional(v.string()), // Temporarily optional to allow migration of old 'body' field
    body: v.optional(v.string()), // Legacy field - will be migrated to 'content'
    user: v.optional(v.string()), // Legacy field
    messageType: v.optional(
      v.union(
        v.literal('appointment'),
        v.literal('general'),
        v.literal('urgent'),
        v.literal('system')
      )
    ),
    priority: v.optional(
      v.union(
        v.literal('low'),
        v.literal('normal'),
        v.literal('high'),
        v.literal('urgent')
      )
    ),
    status: v.optional(
      v.union(
        v.literal('sent'),
        v.literal('delivered'),
        v.literal('read'),
        v.literal('deleted'),
        v.literal('archived')
      )
    ),
    isRead: v.optional(v.boolean()),
    isDeleted: v.optional(v.boolean()),
    isArchived: v.optional(v.boolean()),
    readAt: v.optional(v.number()),
    attachments: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          type: v.string(),
          size: v.number(),
          url: v.string(),
        })
      )
    ),
    threadId: v.optional(v.string()),
    parentMessageId: v.optional(v.id('messages')),
    createdAt: v.optional(v.number()), // Temporarily optional for data migration
    updatedAt: v.optional(v.number()), // Temporarily optional for data migration
  })
    .index('by_tenant_from', ['tenantId', 'fromUserId'])
    .index('by_tenant_to', ['tenantId', 'toUserId'])
    .index('by_thread', ['threadId'])
    .index('by_status', ['status'])
    .index('by_created_at', ['createdAt']),

  auditLogs: defineTable({
    tenantId: v.string(),
    userId: v.optional(v.id('users')),
    action: v.string(),
    resource: v.string(),
    resourceId: v.string(),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
    archivedAt: v.optional(v.number()), // Timestamp when log was archived (null if not archived)
    // PHI access tracking fields for HIPAA compliance
    phiAccessed: v.optional(
      v.object({
        patientId: v.id('patients'), // Patient whose PHI was accessed
        dataElements: v.array(v.string()), // Specific PHI elements accessed (e.g., ["name", "dateOfBirth", "medicalHistory", "labResults"])
        purpose: v.string(), // Purpose for accessing PHI (e.g., "treatment", "payment", "healthcare_operations", "patient_request", "legal_requirement")
      })
    ),
    // Permission change tracking fields for audit trail
    permissionChanges: v.optional(
      v.object({
        userId: v.id('users'), // User whose permissions were changed
        oldPermissions: permissionTreeValidator, // Previous permission structure (PermissionTree format)
        newPermissions: permissionTreeValidator, // New permission structure (PermissionTree format)
        changedBy: v.id('users'), // User who made the permission change
      })
    ),
  })
    .index('by_tenant_user', ['tenantId', 'userId'])
    .index('by_tenant_action', ['tenantId', 'action'])
    .index('by_timestamp', ['timestamp'])
    .index('by_resource', ['resource', 'resourceId'])
    .index('by_archived', ['archivedAt']), // Index for finding archived logs
  // Note: PHI access queries can be filtered by checking phiAccessed.patientId in the query filter
  // Convex doesn't support direct indexing of nested fields, so we query by filtering on phiAccessed.patientId
  // Note: Permission change queries can be filtered by checking permissionChanges.userId or permissionChanges.changedBy in the query filter

  // Archived audit logs table for long-term storage
  // Logs are moved here after retention period expires but must be kept for compliance
  archivedAuditLogs: defineTable({
    tenantId: v.string(),
    userId: v.optional(v.id('users')),
    action: v.string(),
    resource: v.string(),
    resourceId: v.string(),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(), // Original timestamp from auditLogs
    archivedAt: v.number(), // Timestamp when log was archived
    originalLogId: v.id('auditLogs'), // Reference to original log ID (for traceability)
    // PHI access tracking fields for HIPAA compliance
    phiAccessed: v.optional(
      v.object({
        patientId: v.id('patients'),
        dataElements: v.array(v.string()),
        purpose: v.string(),
      })
    ),
    // Permission change tracking fields for audit trail
    permissionChanges: v.optional(
      v.object({
        userId: v.id('users'),
        oldPermissions: permissionTreeValidator,
        newPermissions: permissionTreeValidator,
        changedBy: v.id('users'),
      })
    ),
  })
    .index('by_tenant', ['tenantId'])
    .index('by_timestamp', ['timestamp'])
    .index('by_archived_at', ['archivedAt'])
    .index('by_original_log', ['originalLogId']),

  providerProfiles: defineTable({
    userId: v.id('users'), // Link to users table
    providerId: v.optional(v.id('providers')), // Optional link to providers table
    tenantId: v.string(), // Required for tenant isolation

    // Identity & Credentials
    title: v.optional(
      v.union(
        v.literal('Dr.'),
        v.literal('Mr.'),
        v.literal('Ms.'),
        v.literal('Mrs.'),
        v.literal('Prof.')
      )
    ), // Professional title/prefix
    gender: v.optional(
      v.union(
        v.literal('male'),
        v.literal('female'),
        v.literal('non-binary'),
        v.literal('prefer-not-to-say')
      )
    ), // Demographic information
    npi: v.optional(v.string()), // National Provider Identifier
    licenseNumber: v.optional(v.string()),
    licenseState: v.optional(v.string()),
    specialties: v.array(v.string()), // Array of specialty names
    boardCertifications: v.optional(
      v.array(
        v.object({
          board: v.string(), // e.g., "American Board of Internal Medicine"
          specialty: v.string(), // e.g., "Internal Medicine"
          certificationNumber: v.optional(v.string()),
          issueDate: v.optional(v.string()),
          expirationDate: v.optional(v.string()),
          verified: v.boolean(),
          digitalBadgeUrl: v.optional(v.string()),
        })
      )
    ),
    education: v.optional(
      v.array(
        v.object({
          degree: v.string(), // e.g., "MD", "DO", "PhD"
          institution: v.string(),
          field: v.optional(v.string()),
          graduationYear: v.optional(v.number()),
          verified: v.boolean(),
        })
      )
    ),
    certifications: v.optional(
      v.array(
        v.object({
          name: v.string(),
          issuingOrganization: v.string(),
          issueDate: v.optional(v.string()),
          expirationDate: v.optional(v.string()),
          credentialId: v.optional(v.string()),
          verified: v.boolean(),
        })
      )
    ),

    // Personal Content
    bio: v.optional(v.string()), // Short professional bio
    detailedBio: v.optional(v.string()), // Longer, more detailed bio
    philosophyOfCare: v.optional(v.string()), // Provider's care philosophy
    communicationStyle: v.optional(v.string()), // How provider communicates
    whyIBecameADoctor: v.optional(v.string()), // Personal story
    languages: v.array(v.string()), // Languages spoken
    // Humanizing Elements
    personalInterests: v.optional(v.array(v.string())),
    communityInvolvement: v.optional(v.string()),
    volunteerWork: v.optional(v.string()),

    // Multimedia Assets
    professionalPhotoUrl: v.optional(v.string()),
    professionalPhotoAltText: v.optional(v.string()),
    introductionVideoUrl: v.optional(v.string()), // YouTube/Vimeo URL or S3 URL
    introductionVideoThumbnail: v.optional(v.string()),
    introductionVideoTranscript: v.optional(v.string()), // For accessibility
    introductionVideoCaptions: v.optional(v.string()), // Caption file URL

    // Practice Details
    hospitalAffiliations: v.optional(
      v.array(
        v.object({
          name: v.string(),
          role: v.optional(v.string()), // e.g., "Attending Physician"
          department: v.optional(v.string()),
          startDate: v.optional(v.string()),
          endDate: v.optional(v.string()),
          current: v.boolean(),
        })
      )
    ),
    insuranceAccepted: v.optional(v.array(v.string())), // Insurance plan names
    conditionsTreated: v.optional(v.array(v.string())), // Medical conditions
    proceduresPerformed: v.optional(v.array(v.string())), // Procedures/services
    clinicalInterests: v.optional(v.array(v.string())),
    researchInterests: v.optional(v.array(v.string())),
    publications: v.optional(
      v.array(
        v.object({
          title: v.string(),
          journal: v.optional(v.string()),
          year: v.optional(v.number()),
          url: v.optional(v.string()),
        })
      )
    ),

    // Patient Testimonials
    testimonials: v.optional(v.array(v.id('providerTestimonials'))),

    // Visibility Controls - Field-level privacy settings
    visibility: v.object({
      // Identity fields
      npi: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
      licenseNumber: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
      specialties: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),

      // Credentials
      boardCertifications: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
      education: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
      certifications: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),

      // Personal content
      bio: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
      detailedBio: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
      philosophyOfCare: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
      communicationStyle: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
      whyIBecameADoctor: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
      languages: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),

      // Humanizing elements
      personalInterests: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
      communityInvolvement: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),

      // Multimedia
      professionalPhoto: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
      introductionVideo: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),

      // Practice details
      hospitalAffiliations: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
      insuranceAccepted: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
      conditionsTreated: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
      proceduresPerformed: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
      researchInterests: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
      publications: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),

      // Testimonials
      testimonials: v.union(
        v.literal('public'),
        v.literal('portal'),
        v.literal('private')
      ),
    }),

    // Metadata
    completionPercentage: v.number(), // 0-100, calculated based on required fields
    isVerified: v.boolean(), // Admin verification status
    isPublished: v.boolean(), // Whether profile is published and visible
    lastReviewedAt: v.optional(v.number()), // Last admin review timestamp
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_provider', ['providerId'])
    .index('by_tenant', ['tenantId'])
    .index('by_tenant_user', ['tenantId', 'userId'])
    .index('by_specialty', ['specialties'])
    .index('by_published', ['isPublished'])
    .index('by_tenant_published', ['tenantId', 'isPublished']),

  providerTestimonials: defineTable({
    providerProfileId: v.id('providerProfiles'),
    tenantId: v.string(),
    patientId: v.optional(v.id('patients')), // Optional - may be anonymous
    patientFirstName: v.string(), // First name only for privacy
    patientLastNameInitial: v.optional(v.string()), // Last initial only
    rating: v.number(), // 1-5 stars
    comment: v.string(), // Written testimonial
    consentGiven: v.boolean(), // Patient consent for publication
    isVerified: v.boolean(), // Verified as authentic patient
    isApproved: v.boolean(), // Admin approval for display
    isPublished: v.boolean(), // Published and visible
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_provider', ['providerProfileId'])
    .index('by_tenant', ['tenantId'])
    .index('by_published', ['isPublished'])
    .index('by_tenant_provider', ['tenantId', 'providerProfileId']),

  // Public provider profiles for tenant landing pages (visible without authentication)
  publicProviderProfiles: defineTable({
    tenantId: v.string(),
    providerProfileId: v.id('providerProfiles'), // Reference to internal provider profile
    displayName: v.string(), // Public display name
    title: v.string(), // e.g., "Family Medicine Physician", "Pediatrician"
    bio: v.string(), // Public biography
    photo: v.optional(v.string()), // Profile photo URL
    specialties: v.array(v.string()), // List of specialties for display
    languages: v.optional(v.array(v.string())), // Languages spoken
    education: v.optional(
      v.array(
        v.object({
          degree: v.string(),
          institution: v.string(),
          year: v.optional(v.number()),
        })
      )
    ),
    certifications: v.optional(v.array(v.string())), // Board certifications
    clinicIds: v.array(v.string()), // Which clinics they appear on (empty = all)
    acceptingNewPatients: v.boolean(),
    displayOrder: v.number(), // Order in care team section
    isPublished: v.boolean(), // Whether visible on public landing page
    showOnLandingPage: v.optional(v.boolean()), // Featured on main landing page
    bookingEnabled: v.optional(v.boolean()), // Allow direct booking with this provider
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_tenant', ['tenantId'])
    .index('by_tenant_published', ['tenantId', 'isPublished'])
    .index('by_provider', ['providerProfileId'])
    .index('by_display_order', ['tenantId', 'displayOrder']),

  // Public booking requests (for "request" booking mode - not direct scheduling)
  bookingRequests: defineTable({
    tenantId: v.string(),
    clinicId: v.optional(v.string()), // Selected clinic (if multi-clinic)
    providerId: v.optional(v.id('publicProviderProfiles')), // Selected provider (if any)
    appointmentTypeId: v.optional(v.string()), // Selected appointment type
    // Patient information (collected during booking)
    patientName: v.string(),
    patientEmail: v.string(),
    patientPhone: v.optional(v.string()),
    patientDateOfBirth: v.optional(v.string()), // YYYY-MM-DD format
    insuranceProvider: v.optional(v.string()),
    insuranceMemberId: v.optional(v.string()),
    // Scheduling preferences
    preferredDates: v.array(v.string()), // Array of preferred dates (YYYY-MM-DD)
    preferredTimeOfDay: v.optional(
      v.union(
        v.literal('morning'),
        v.literal('afternoon'),
        v.literal('evening'),
        v.literal('any')
      )
    ),
    notes: v.optional(v.string()), // Patient notes/reason for visit
    // Status tracking
    status: v.union(
      v.literal('pending'), // Awaiting clinic review
      v.literal('contacted'), // Clinic has contacted patient
      v.literal('scheduled'), // Appointment has been scheduled
      v.literal('confirmed'), // Patient confirmed appointment
      v.literal('declined'), // Clinic declined request
      v.literal('cancelled'), // Patient cancelled request
      v.literal('no_show') // Patient didn't respond/show up
    ),
    scheduledAppointmentId: v.optional(v.id('appointments')), // Reference to created appointment
    // Audit trail
    assignedTo: v.optional(v.id('users')), // Staff member handling request
    lastContactedAt: v.optional(v.number()),
    responseNotes: v.optional(v.string()), // Internal notes from clinic
    // Source tracking
    source: v.optional(
      v.union(
        v.literal('landing_page'), // From public landing page
        v.literal('direct_link'), // From direct booking link
        v.literal('referral'), // From referral
        v.literal('phone'), // Phone call converted to request
        v.literal('other')
      )
    ),
    sourceUrl: v.optional(v.string()), // URL where booking was initiated
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_tenant', ['tenantId'])
    .index('by_tenant_status', ['tenantId', 'status'])
    .index('by_email', ['patientEmail'])
    .index('by_tenant_clinic', ['tenantId', 'clinicId'])
    .index('by_assigned_to', ['assignedTo'])
    .index('by_created_at', ['tenantId', 'createdAt']),

  invoices: defineTable({
    patientId: v.id('patients'),
    appointmentId: v.optional(v.id('appointments')),
    invoiceNumber: v.string(),
    amount: v.number(), // Amount in cents
    status: v.union(
      v.literal('pending'),
      v.literal('paid'),
      v.literal('overdue'),
      v.literal('cancelled'),
      v.literal('draft'), // New: claim not yet submitted
      v.literal('submitted'), // New: claim submitted to insurance
      v.literal('denied'), // New: claim denied by insurance
      v.literal('partially_paid') // New: partial payment received
    ),
    serviceType: v.string(), // 'Appointment', 'Lab Services', 'Procedure', etc.
    description: v.string(),
    dueDate: v.number(), // Timestamp
    paidDate: v.optional(v.number()), // Timestamp
    paymentMethod: v.optional(v.string()),
    // New fields from Task 1.3
    claimId: v.optional(v.id('insuranceClaims')), // Optional reference to insurance claim
    patientResponsibility: v.number(), // Patient's portion in cents
    insuranceResponsibility: v.number(), // Insurance portion in cents
    tenantId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_patient', ['patientId'])
    .index('by_tenant', ['tenantId'])
    .index('by_tenant_patient', ['tenantId', 'patientId'])
    .index('by_status', ['status'])
    .index('by_due_date', ['dueDate'])
    .index('by_claim', ['claimId']) // New: for querying invoices by claim
    .index('by_patient_status', ['patientId', 'status']), // New: composite index for patient + status queries

  insurancePayers: defineTable({
    payerId: v.string(), // Unique identifier for the payer (e.g., "BCBS-CA-001", "AETNA-001")
    name: v.string(), // Display name (e.g., "Blue Cross Blue Shield", "Aetna")
    planType: v.union(
      v.literal('hmo'), // Health Maintenance Organization
      v.literal('ppo'), // Preferred Provider Organization
      v.literal('medicare'), // Medicare
      v.literal('medicaid'), // Medicaid
      v.literal('tricare'), // TRICARE (military)
      v.literal('commercial'), // Commercial insurance
      v.literal('self_pay') // Self-pay (no insurance)
    ),
    contactInfo: v.object({
      phone: v.optional(v.string()),
      email: v.optional(v.string()),
      address: v.optional(
        v.object({
          street: v.string(),
          city: v.string(),
          state: v.string(),
          zipCode: v.string(),
        })
      ),
      website: v.optional(v.string()),
      claimsAddress: v.optional(
        v.object({
          street: v.string(),
          city: v.string(),
          state: v.string(),
          zipCode: v.string(),
        })
      ),
    }),
    tenantId: v.string(), // Required for tenant isolation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_tenant', ['tenantId'])
    .index('by_payer_id', ['payerId'])
    .index('by_plan_type', ['planType'])
    .index('by_tenant_plan_type', ['tenantId', 'planType'])
    .index('by_tenant_payer_id', ['tenantId', 'payerId']),

  insuranceClaims: defineTable({
    patientId: v.id('patients'), // Patient for whom the claim is filed
    providerId: v.id('providers'), // Provider who rendered the service
    payerId: v.id('insurancePayers'), // Insurance payer/payer
    invoiceId: v.optional(v.id('invoices')), // Optional reference to invoice
    status: v.union(
      v.literal('draft'), // Claim is being prepared
      v.literal('submitted'), // Claim submitted to payer
      v.literal('accepted'), // Claim accepted by payer
      v.literal('denied'), // Claim denied by payer
      v.literal('paid') // Claim paid by payer
    ),
    totalCharges: v.number(), // Total charges in cents
    datesOfService: v.array(v.number()), // Array of timestamps for service dates
    claimControlNumber: v.string(), // Unique claim control number
    denialReason: v.optional(v.string()), // Reason for denial if status is "denied"
    tenantId: v.string(), // Required for tenant isolation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_patient', ['patientId'])
    .index('by_provider', ['providerId'])
    .index('by_payer', ['payerId'])
    .index('by_status', ['status'])
    .index('by_tenant', ['tenantId'])
    .index('by_invoice', ['invoiceId'])
    .index('by_tenant_patient', ['tenantId', 'patientId'])
    .index('by_tenant_provider', ['tenantId', 'providerId'])
    .index('by_tenant_payer', ['tenantId', 'payerId'])
    .index('by_tenant_status', ['tenantId', 'status'])
    .index('by_claim_control_number', ['claimControlNumber']),

  claimLineItems: defineTable({
    claimId: v.id('insuranceClaims'), // Reference to the insurance claim
    procedureCode: v.string(), // CPT or HCPCS code (e.g., "99213", "J3301")
    modifiers: v.array(v.string()), // Array of modifier codes (e.g., ["25", "59"])
    diagnosisCodes: v.array(v.string()), // Array of ICD-10 diagnosis codes (e.g., ["E11.9", "I10"])
    units: v.number(), // Number of units for this procedure
    chargeAmount: v.number(), // Charge amount in cents
    tenantId: v.string(), // Required for tenant isolation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_claim', ['claimId'])
    .index('by_tenant', ['tenantId'])
    .index('by_tenant_claim', ['tenantId', 'claimId']),

  patientPayments: defineTable({
    patientId: v.id('patients'), // Patient who made the payment
    invoiceId: v.id('invoices'), // Invoice this payment applies to
    amount: v.number(), // Payment amount in cents
    paymentMethod: v.union(
      v.literal('credit_card'),
      v.literal('debit_card'),
      v.literal('check'),
      v.literal('cash'),
      v.literal('bank_transfer'),
      v.literal('ach'),
      v.literal('other')
    ),
    transactionId: v.optional(v.string()), // External transaction ID from payment processor
    paidAt: v.number(), // Timestamp when payment was received
    tenantId: v.string(), // Required for tenant isolation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_patient', ['patientId'])
    .index('by_invoice', ['invoiceId'])
    .index('by_tenant', ['tenantId'])
    .index('by_tenant_patient', ['tenantId', 'patientId'])
    .index('by_tenant_invoice', ['tenantId', 'invoiceId'])
    .index('by_paid_at', ['paidAt']),

  insurancePayments: defineTable({
    claimId: v.id('insuranceClaims'), // Claim this payment applies to
    amount: v.number(), // Payment amount in cents
    adjustmentAmount: v.number(), // Adjustment amount in cents (e.g., contractual adjustments, write-offs)
    checkNumber: v.optional(v.string()), // Check number if payment was by check
    transactionId: v.optional(v.string()), // External transaction ID from payer
    paidAt: v.number(), // Timestamp when payment was received
    tenantId: v.string(), // Required for tenant isolation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_claim', ['claimId'])
    .index('by_tenant', ['tenantId'])
    .index('by_tenant_claim', ['tenantId', 'claimId'])
    .index('by_paid_at', ['paidAt']),

  rateLimits: defineTable({
    identifier: v.string(), // e.g., "password_change:userId" or "password_change:email"
    action: v.string(), // e.g., "password_change"
    attempts: v.number(),
    windowStart: v.number(), // Timestamp when the window started
    windowMs: v.number(), // Window duration in milliseconds
    maxAttempts: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_identifier', ['identifier'])
    .index('by_action', ['action'])
    .index('by_identifier_action', ['identifier', 'action']),

  // Calendar System Tables
  locations: defineTable({
    name: v.string(),
    address: v.optional(
      v.object({
        street: v.string(),
        city: v.string(),
        state: v.string(),
        zipCode: v.string(),
        country: v.optional(v.string()),
      })
    ),
    phone: v.optional(v.string()),
    type: v.union(
      v.literal('office'),
      v.literal('hospital'),
      v.literal('telehealth')
    ),
    tenantId: v.string(), // Required for tenant isolation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_tenant', ['tenantId'])
    .index('by_type', ['type'])
    .index('by_tenant_type', ['tenantId', 'type']),

  providerLocations: defineTable({
    providerId: v.id('providers'),
    locationId: v.optional(v.id('locations')), // DEPRECATED: Use clinicId instead. Kept for migration.
    clinicId: v.optional(v.id('clinics')), // Clinic this provider is assigned to (preferred over locationId)
    isDefault: v.boolean(), // Whether this is the provider's default location/clinic
    availabilitySchedule: v.optional(v.any()), // Optional location/clinic-specific schedule override
    tenantId: v.string(), // Required for tenant isolation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_provider', ['providerId'])
    .index('by_location', ['locationId'])
    .index('by_clinic', ['clinicId'])
    .index('by_tenant', ['tenantId'])
    .index('by_provider_tenant', ['providerId', 'tenantId'])
    .index('by_provider_clinic', ['providerId', 'clinicId'])
    .index('by_default', ['providerId', 'isDefault']),

  // Note: Table name kept as "providerAvailability" for backward compatibility
  // but now supports both providerId (optional) and userId (optional) for user-based availability
  providerAvailability: defineTable({
    providerId: v.optional(v.id('providers')), // Optional - for backward compatibility
    userId: v.optional(v.id('users')), // User-based availability (preferred)
    locationId: v.optional(v.id('locations')), // Optional - null means applies to all locations (DEPRECATED: use clinicId)
    clinicId: v.optional(v.id('clinics')), // The clinic this availability applies to (preferred over locationId)
    dayOfWeek: v.union(
      v.literal('monday'),
      v.literal('tuesday'),
      v.literal('wednesday'),
      v.literal('thursday'),
      v.literal('friday'),
      v.literal('saturday'),
      v.literal('sunday')
    ),
    startTime: v.string(), // Time in HH:mm format (24-hour) - interpreted in clinic timezone
    endTime: v.string(), // Time in HH:mm format (24-hour) - interpreted in clinic timezone
    isRecurring: v.boolean(), // true for weekly recurring, false for one-time override
    overrideDate: v.optional(v.number()), // Timestamp for date-specific overrides (when isRecurring is false)
    tenantId: v.string(), // Required for tenant isolation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_provider', ['providerId'])
    .index('by_user', ['userId'])
    .index('by_location', ['locationId'])
    .index('by_clinic', ['clinicId'])
    .index('by_tenant', ['tenantId'])
    .index('by_provider_day', ['providerId', 'dayOfWeek'])
    .index('by_user_day', ['userId', 'dayOfWeek'])
    .index('by_provider_recurring', ['providerId', 'isRecurring'])
    .index('by_user_recurring', ['userId', 'isRecurring'])
    .index('by_override_date', ['overrideDate'])
    .index('by_provider_tenant', ['providerId', 'tenantId'])
    .index('by_user_tenant', ['userId', 'tenantId'])
    .index('by_user_clinic', ['userId', 'clinicId'])
    .index('by_provider_clinic', ['providerId', 'clinicId']),

  /**
   * Opening Hours - Business hours for company/clinics
   * Defines when clinics are open for appointments.
   * Company-level (clinicId = undefined) entries serve as defaults.
   * Clinic-level entries override company defaults.
   * Date overrides take precedence over recurring schedules.
   */
  openingHours: defineTable({
    tenantId: v.string(), // Required for tenant isolation
    clinicId: v.optional(v.id('clinics')), // If set, clinic-specific. If undefined, company default.
    dayOfWeek: v.union(
      v.literal('monday'),
      v.literal('tuesday'),
      v.literal('wednesday'),
      v.literal('thursday'),
      v.literal('friday'),
      v.literal('saturday'),
      v.literal('sunday')
    ),
    startTime: v.string(), // Time in HH:mm format (24-hour) - interpreted in clinic/company timezone
    endTime: v.string(), // Time in HH:mm format (24-hour) - interpreted in clinic/company timezone
    isRecurring: v.boolean(), // true for weekly recurring, false for date-specific override
    overrideDate: v.optional(v.string()), // YYYY-MM-DD string for date-specific overrides (in schedule's timezone)
    isClosed: v.optional(v.boolean()), // If true, indicates closed on this day/date (used for closures)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_tenant', ['tenantId'])
    .index('by_clinic', ['clinicId'])
    .index('by_tenant_clinic', ['tenantId', 'clinicId'])
    .index('by_day', ['dayOfWeek'])
    .index('by_tenant_day', ['tenantId', 'dayOfWeek'])
    .index('by_tenant_clinic_day', ['tenantId', 'clinicId', 'dayOfWeek'])
    .index('by_recurring', ['isRecurring'])
    .index('by_override_date', ['overrideDate'])
    .index('by_tenant_override_date', ['tenantId', 'overrideDate']),

  calendarSync: defineTable({
    userId: v.optional(v.id('users')), // User who owns the calendar (preferred)
    providerId: v.optional(v.id('providers')), // Deprecated - kept for backward compatibility
    syncType: v.union(
      v.literal('google'),
      v.literal('microsoft'),
      v.literal('apple')
    ),
    accessToken: v.string(), // Encrypted access token
    refreshToken: v.optional(v.string()), // Encrypted refresh token
    calendarId: v.optional(v.string()), // External calendar ID
    lastSyncAt: v.optional(v.number()), // Timestamp of last successful sync
    syncDirection: v.union(
      v.literal('bidirectional'),
      v.literal('outbound-only')
    ),
    tenantId: v.string(), // Required for tenant isolation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_provider', ['providerId'])
    .index('by_tenant', ['tenantId'])
    .index('by_sync_type', ['syncType'])
    .index('by_user_tenant', ['userId', 'tenantId'])
    .index('by_provider_tenant', ['providerId', 'tenantId']),

  calendarShares: defineTable({
    ownerUserId: v.id('users'), // User who owns the calendar
    sharedWithUserId: v.id('users'), // User who has access to the calendar
    permission: v.union(
      v.literal('view'), // View-only access
      v.literal('edit') // View and edit access
    ),
    tenantId: v.string(), // Required for tenant isolation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_owner', ['ownerUserId'])
    .index('by_shared_with', ['sharedWithUserId'])
    .index('by_tenant', ['tenantId'])
    .index('by_owner_shared_with', ['ownerUserId', 'sharedWithUserId']),

  customRoles: defineTable({
    tenantId: v.string(), // Required for tenant isolation
    name: v.string(), // Role name (e.g., "Nurse", "Receptionist", "Billing Specialist")
    description: v.optional(v.string()), // Optional description of the role
    permissions: permissionTreeValidator,
    isTemplate: v.boolean(), // Whether this role is a template that can be reused
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_tenant', ['tenantId'])
    .index('by_template', ['isTemplate']),

  clinics: defineTable({
    tenantId: v.string(), // Required for tenant isolation
    name: v.string(), // Clinic name (e.g., "Cardiology", "Pediatrics", "General Practice")
    description: v.optional(v.string()), // Optional description of the clinic
    // Address can be structured object OR legacy string for backward compatibility
    address: v.optional(
      v.union(
        v.object({
          street: v.string(),
          city: v.string(),
          state: v.string(),
          zipCode: v.string(),
          country: v.optional(v.string()),
        }),
        v.string() // Legacy string format for existing data
      )
    ),
    // Legacy address field for backward compatibility (will be migrated to structured address)
    addressLegacy: v.optional(v.string()),
    phone: v.optional(v.string()), // Clinic phone number (merged from locations)
    type: v.optional(
      v.union(
        v.literal('office'),
        v.literal('hospital'),
        v.literal('telehealth')
      )
    ), // Clinic type (merged from locations) - optional for backward compatibility
    timezone: v.optional(v.string()), // IANA timezone (e.g., "America/New_York", "Europe/Oslo"). If not set, defaults to tenant timezone.
    isActive: v.boolean(), // Whether the clinic is active
    // Migration tracking
    migratedFromLocationId: v.optional(v.string()), // Original location ID if migrated from locations table
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_tenant', ['tenantId'])
    .index('by_type', ['type'])
    .index('by_tenant_type', ['tenantId', 'type']),

  supportAccessRequests: defineTable({
    superadminId: v.id('users'), // Superadmin requesting access
    targetUserId: v.optional(v.id('users')), // User account to access (optional - can be tenant-level access)
    targetTenantId: v.string(), // Tenant to access
    purpose: v.string(), // Reason for access request
    status: v.union(
      v.literal('pending'), // Request created, awaiting approval
      v.literal('approved'), // Approved with digital signature, access granted
      v.literal('denied'), // User denied the request
      v.literal('expired') // Access expired (1 hour after approval)
    ),
    digitalSignature: v.optional(
      v.object({
        signatureData: v.string(), // Base64 encoded signature image/data
        signedAt: v.number(), // Timestamp when signature was provided
        ipAddress: v.optional(v.string()), // IP address at time of signature
        userAgent: v.optional(v.string()), // User agent at time of signature
        consentText: v.string(), // The consent text that was agreed to
      })
    ),
    expirationTimestamp: v.optional(v.number()), // Timestamp when access expires (1 hour after approval)
    approvedBy: v.optional(v.id('users')), // User who approved the request
    deniedBy: v.optional(v.id('users')), // User who denied the request
    deniedReason: v.optional(v.string()), // Reason for denial if denied
    auditTrail: v.array(
      v.object({
        action: v.union(
          v.literal('requested'), // Request created
          v.literal('approved'), // Request approved with signature
          v.literal('denied'), // Request denied
          v.literal('accessed'), // Superadmin accessed the account
          v.literal('expired'), // Access expired
          v.literal('revoked') // Access manually revoked
        ),
        timestamp: v.number(), // When the action occurred
        userId: v.id('users'), // User who performed the action
        details: v.optional(v.any()), // Additional details about the action
        ipAddress: v.optional(v.string()), // IP address at time of action
        userAgent: v.optional(v.string()), // User agent at time of action
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_superadmin', ['superadminId'])
    .index('by_target_user', ['targetUserId'])
    .index('by_status', ['status'])
    .index('by_target_tenant', ['targetTenantId'])
    .index('by_superadmin_status', ['superadminId', 'status'])
    .index('by_expiration', ['expirationTimestamp']),

  invitations: defineTable({
    tenantId: v.string(), // Required for tenant isolation
    email: v.string(), // Email address of the invited user
    token: v.string(), // Unique invitation token (cryptographically secure)
    clinicIds: v.array(v.string()), // Array of clinic IDs the user will be assigned to
    customRoleId: v.id('customRoles'), // Custom role that will be assigned to the user
    invitedBy: v.id('users'), // User who sent the invitation (must be owner)
    status: v.union(
      v.literal('pending'), // Invitation sent, awaiting acceptance
      v.literal('accepted'), // Invitation accepted, user registered
      v.literal('expired'), // Invitation expired (default: 7 days)
      v.literal('cancelled') // Invitation cancelled by owner
    ),
    expiresAt: v.number(), // Timestamp when invitation expires (default: 7 days from creation)
    acceptedAt: v.optional(v.number()), // Timestamp when invitation was accepted
    acceptedBy: v.optional(v.id('users')), // User ID if invitation was accepted (links to created user)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_tenant', ['tenantId'])
    .index('by_email', ['email'])
    .index('by_token', ['token'])
    .index('by_status', ['status'])
    .index('by_invited_by', ['invitedBy'])
    .index('by_expires_at', ['expiresAt'])
    .index('by_tenant_email', ['tenantId', 'email'])
    .index('by_tenant_status', ['tenantId', 'status']),

  sessions: defineTable({
    userId: v.id('users'), // User who owns this session
    sessionId: v.string(), // Unique session identifier (JWT token ID or similar)
    tenantId: v.string(), // Tenant ID for tenant isolation
    ipAddress: v.optional(v.string()), // IP address where session was created
    userAgent: v.optional(v.string()), // User agent string
    createdAt: v.number(), // Timestamp when session was created
    lastActivity: v.number(), // Timestamp of last activity (updated on each request)
    expiresAt: v.optional(v.number()), // Timestamp when session expires (optional, for cleanup)
  })
    .index('by_user', ['userId'])
    .index('by_session_id', ['sessionId'])
    .index('by_tenant', ['tenantId'])
    .index('by_user_tenant', ['userId', 'tenantId'])
    .index('by_expires_at', ['expiresAt']),

  sessionActivity: defineTable({
    sessionId: v.string(), // Reference to session.sessionId
    userId: v.id('users'), // User who owns the session (for quick filtering)
    tenantId: v.string(), // Tenant ID for tenant isolation
    activityType: v.union(
      v.literal('activity'), // General activity (page view, API call, etc.)
      v.literal('phi_access'), // PHI access event
      v.literal('permission_change'), // Permission change event
      v.literal('security_event'), // Security-related event (login, logout, etc.)
      v.literal('data_export'), // Data export event
      v.literal('data_deletion'), // Data deletion event
      v.literal('settings_change') // Settings change event
    ),
    action: v.string(), // Specific action (e.g., "view_patient", "update_record", "export_data")
    resource: v.optional(v.string()), // Resource type (e.g., "patient", "medicalRecord")
    resourceId: v.optional(v.string()), // ID of the resource accessed
    details: v.optional(v.any()), // Additional details about the activity
    ipAddress: v.optional(v.string()), // IP address at time of activity
    userAgent: v.optional(v.string()), // User agent at time of activity
    timestamp: v.number(), // Timestamp when activity occurred
    // Link to audit log if this activity was also logged in audit logs
    auditLogId: v.optional(v.id('auditLogs')),
  })
    .index('by_session', ['sessionId'])
    .index('by_user', ['userId'])
    .index('by_tenant', ['tenantId'])
    .index('by_session_timestamp', ['sessionId', 'timestamp'])
    .index('by_user_timestamp', ['userId', 'timestamp'])
    .index('by_activity_type', ['activityType'])
    .index('by_action', ['action']),

  // ============================================================================
  // ACCESS CONTROL & SHARING SYSTEM TABLES
  // These tables implement user-controlled sharing settings, separating
  // data visibility from role-based feature access (HIPAA-compliant design)
  // ============================================================================

  /**
   * User Sharing Settings - User-level sharing preferences
   * Controls default visibility for calendar, patients, and messages.
   * Private by default (minimum necessary principle for HIPAA).
   */
  userSharingSettings: defineTable({
    userId: v.id('users'),
    tenantId: v.string(),
    // Calendar default sharing preference
    calendarDefaultSharing: v.union(
      v.literal('private'), // Only user can see (default)
      v.literal('care_team'), // Care team members can see
      v.literal('company') // All company staff can see
    ),
    // Patient records default sharing preference
    patientsDefaultSharing: v.union(
      v.literal('private'),
      v.literal('care_team'),
      v.literal('company')
    ),
    // Messages default sharing preference
    messagesDefaultSharing: v.union(
      v.literal('private'),
      v.literal('care_team'),
      v.literal('company')
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_tenant', ['tenantId'])
    .index('by_user_tenant', ['userId', 'tenantId']),

  /**
   * Patient Shares - Patient-level sharing (mirrors calendarShares pattern)
   * Allows providers to share access to specific patients with other staff.
   * HIPAA: Creates audit trail for PHI access delegation.
   */
  patientShares: defineTable({
    ownerUserId: v.id('users'), // Provider who manages this patient relationship
    patientId: v.id('patients'), // The patient being shared
    sharedWithUserId: v.id('users'), // Staff member granted access
    permission: v.union(
      v.literal('view'), // Can view patient records
      v.literal('edit') // Can view and edit patient records
    ),
    tenantId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_owner', ['ownerUserId'])
    .index('by_patient', ['patientId'])
    .index('by_shared_with', ['sharedWithUserId'])
    .index('by_owner_patient', ['ownerUserId', 'patientId'])
    .index('by_owner_shared_with', ['ownerUserId', 'sharedWithUserId'])
    .index('by_patient_shared_with', ['patientId', 'sharedWithUserId'])
    .index('by_tenant', ['tenantId']),

  /**
   * Primary Provider History - Audit trail for primary provider changes
   * Tracks all changes to a patient's primary provider for compliance and continuity.
   * HIPAA: Maintains accountability chain for patient care responsibility.
   */
  primaryProviderHistory: defineTable({
    patientId: v.id('patients'),
    previousProviderId: v.optional(v.id('users')), // null if this is the first assignment
    newProviderId: v.id('users'), // The newly assigned primary provider
    reason: v.string(), // "initial_assignment", "patient_request", "provider_leaving", "insurance_change", "internal_transfer", "other"
    notes: v.optional(v.string()), // Additional context for the change
    changedBy: v.id('users'), // User who made the change
    tenantId: v.string(),
    createdAt: v.number(), // When the change was made
  })
    .index('by_patient', ['patientId'])
    .index('by_previous_provider', ['previousProviderId'])
    .index('by_new_provider', ['newProviderId'])
    .index('by_tenant', ['tenantId'])
    .index('by_patient_created', ['patientId', 'createdAt'])
    .index('by_changed_by', ['changedBy']),

  /**
   * Care Team Members - Explicit care team assignments
   * Used when a patient has no medical records or appointments yet.
   * Complements automatic care team detection from records/appointments.
   */
  careTeamMembers: defineTable({
    patientId: v.id('patients'),
    userId: v.id('users'),
    role: v.string(), // "Primary Provider", "Specialist", "Nurse", "Care Coordinator", etc.
    addedBy: v.id('users'), // User who added this care team member
    isActive: v.boolean(), // Active status for soft delete
    tenantId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_patient', ['patientId'])
    .index('by_user', ['userId'])
    .index('by_tenant', ['tenantId'])
    .index('by_patient_user', ['patientId', 'userId'])
    .index('by_patient_active', ['patientId', 'isActive'])
    .index('by_user_active', ['userId', 'isActive']),

  /**
   * Medical Record Members - Card-level access control
   * Replaces mock careTeam data on medical record cards.
   * Allows granular sharing of specific medical records.
   */
  medicalRecordMembers: defineTable({
    medicalRecordId: v.id('medicalRecords'),
    userId: v.id('users'),
    permission: v.union(v.literal('view'), v.literal('edit')),
    addedBy: v.id('users'),
    tenantId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_record', ['medicalRecordId'])
    .index('by_user', ['userId'])
    .index('by_tenant', ['tenantId'])
    .index('by_record_user', ['medicalRecordId', 'userId']),

  /**
   * Message Assignments - Message delegation with audit trail
   * Allows staff to delegate message responses to colleagues.
   * Full audit trail for HIPAA compliance and accountability.
   */
  messageAssignments: defineTable({
    messageId: v.id('messages'),
    assignedBy: v.id('users'), // User who delegated the message
    assignedTo: v.id('users'), // User assigned to respond
    status: v.union(
      v.literal('pending'), // Awaiting action
      v.literal('in_progress'), // Being worked on
      v.literal('completed'), // Response sent
      v.literal('declined') // Assignment declined
    ),
    notes: v.optional(v.string()), // Assignment notes/instructions
    respondedAt: v.optional(v.number()), // When response was sent
    responseMessageId: v.optional(v.id('messages')), // Link to response message
    declinedReason: v.optional(v.string()), // Reason if declined
    tenantId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_message', ['messageId'])
    .index('by_assigned_to', ['assignedTo'])
    .index('by_assigned_by', ['assignedBy'])
    .index('by_status', ['status'])
    .index('by_tenant', ['tenantId'])
    .index('by_assigned_to_status', ['assignedTo', 'status'])
    .index('by_assigned_by_status', ['assignedBy', 'status']),

  /**
   * Website Builder Version History
   * Stores snapshots of website configurations for version control and rollback
   */
  websiteBuilderVersions: defineTable({
    tenantId: v.string(),
    version: v.string(), // Semantic version (e.g., "1.0.0", "1.1.0")
    versionNumber: v.number(), // Auto-incrementing version number for ordering
    label: v.optional(v.string()), // Optional custom label (e.g., "Before rebrand", "Holiday theme")

    // Snapshot of the website configuration
    snapshot: v.object({
      templateId: v.union(
        v.literal('classic-stacked'),
        v.literal('bento-grid'),
        v.literal('split-hero'),
        v.literal('multi-location'),
        v.literal('team-forward')
      ),
      header: v.any(), // Full header configuration
      footer: v.any(), // Full footer configuration
      theme: v.any(), // Full theme configuration
      blocks: v.any(), // Full blocks array
      seo: v.any(), // Full SEO configuration
    }),

    // Metadata
    isPublished: v.boolean(), // Whether this version was published to the public site
    createdBy: v.optional(v.string()), // User who created this version
    createdAt: v.number(),
    restoredFrom: v.optional(v.number()), // If restored from another version, store that version number
    note: v.optional(v.string()), // Optional notes about changes in this version
  })
    .index('by_tenant', ['tenantId'])
    .index('by_tenant_version', ['tenantId', 'versionNumber'])
    .index('by_tenant_created', ['tenantId', 'createdAt']),
})
