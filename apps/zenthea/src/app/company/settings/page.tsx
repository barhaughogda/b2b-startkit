"use client";

import React, { useState } from "react";
import { useZentheaSession } from "@/hooks/useZentheaSession";
import { ClinicLayout } from "@/components/layout/ClinicLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  UserCog, 
  Building2, 
  MapPin, 
  Shield, 
  LayoutDashboard, 
  BarChart3, 
  FileText,
  CreditCard,
  Star,
  TrendingUp,
  Calendar,
  Briefcase,
  Activity,
  Megaphone,
  Palette,
  Globe,
  LucideIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ProfileSection } from "@/components/patient/profile/ProfileSection";
import { PatientAvatarUpload } from "@/components/patient/PatientAvatarUpload";
import { useClinicProfile } from "@/hooks/useClinicProfile";
import { ClinicProfileEditor } from "@/components/clinic/ClinicProfileEditor";

// Section configuration with icons
interface SettingsSection {
  id: string;
  title: string;
  icon: LucideIcon;
  cards: SettingsCard[];
}

interface SettingsCard {
  id: string;
  title: string;
  url?: string;
  icon: LucideIcon;
  description: string;
  buttonText: string;
  onClick?: () => void;
}

export default function ClinicSettingsPage() {
  const { data: session, status } = useZentheaSession();
  const router = useRouter();
  const { tenantData, isLoading: isLoadingProfile } = useClinicProfile();
  
  // Collapsible sections state - default to all sections collapsed
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Company info from tenant data
  const companyLogo = tenantData?.branding?.logo;
  const companyName = tenantData?.name || 'Company';
  const companyEmail = tenantData?.contactInfo?.email;

  if (status === "loading") {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-text-secondary">Loading...</p>
        </div>
      </ClinicLayout>
    );
  }

  if (status === "unauthenticated") {
    return (
      <ClinicLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-text-secondary">Please sign in to access this page.</p>
        </div>
      </ClinicLayout>
    );
  }

  // All sections with their cards
  const allSections: SettingsSection[] = [
    {
      id: 'marketing',
      title: 'Marketing',
      icon: Megaphone,
      cards: [
        {
          id: 'branding',
          title: 'Branding',
          url: '/company/settings/branding',
          icon: Palette,
          description: 'Customize your clinic\'s logo, colors, and visual identity',
          buttonText: 'Manage Branding',
        },
        {
          id: 'website',
          title: 'Website',
          icon: Globe,
          description: 'Manage your clinic\'s website settings and configuration',
          buttonText: 'Manage Website',
          onClick: () => {
            const builderUrl = process.env.NEXT_PUBLIC_WEBSITES_BUILDER_URL || 'http://localhost:3002';
            window.open(`${builderUrl}?tenantId=${session?.user?.tenantId}`, '_blank');
          }
        },
      ],
    },
    {
      id: 'organization',
      title: 'Organization Management',
      icon: Building2,
      cards: [
        {
          id: 'departments',
          title: 'Clinics',
          description: 'Organize users into clinics',
          url: '/company/settings/clinics',
          icon: MapPin,
          buttonText: 'Manage Clinics',
        },
        {
          id: 'roles',
          title: 'Roles',
          description: 'Create and manage custom roles',
          url: '/company/settings/roles',
          icon: UserCog,
          buttonText: 'Manage Roles',
        },
        {
          id: 'users',
          title: 'Users',
          description: 'Manage clinic users and invitations',
          url: '/company/settings/users',
          icon: Users,
          buttonText: 'Manage Users',
        },
        {
          id: 'subscription',
          title: 'Subscription',
          description: 'Manage your clinic\'s subscription to Zenthea',
          url: '/company/settings/subscription',
          icon: CreditCard,
          buttonText: 'Manage Subscription',
        },
      ],
    },
    {
      id: 'operations',
      title: 'Operations Management',
      icon: Briefcase,
      cards: [
        {
          id: 'booking',
          title: 'Booking Settings',
          url: '/company/settings/booking',
          icon: Calendar,
          description: 'Configure online booking mode, requirements, and appointment types',
          buttonText: 'Manage Booking',
        },
        {
          id: 'billing',
          title: 'Billing Management',
          url: '/company/billing',
          icon: CreditCard,
          description: 'Manage outstanding receivables, invoices, and claims',
          buttonText: 'Manage Billing',
        },
      ],
    },
    {
      id: 'quality',
      title: 'Quality & Performance',
      icon: Activity,
      cards: [
        {
          id: 'feedback',
          title: 'Client Feedback & Ratings',
          url: '/company/settings/feedback',
          icon: Star,
          description: 'View clinic and provider ratings, testimonials, and reviews',
          buttonText: 'View Feedback',
        },
        {
          id: 'provider-performance',
          title: 'Provider Performance',
          url: '/company/settings/providers/performance',
          icon: TrendingUp,
          description: 'View individual provider ratings and performance metrics',
          buttonText: 'View Performance',
        },
        {
          id: 'analytics',
          title: 'Analytics',
          description: 'View analytics and insights for your clinic',
          url: '/company/settings/analytics',
          icon: BarChart3,
          buttonText: 'View Analytics',
        },
        {
          id: 'reports',
          title: 'Reports',
          description: 'Generate and view reports for your clinic',
          url: '/company/settings/reports',
          icon: FileText,
          buttonText: 'View Reports',
        },
      ],
    },
    {
      id: 'security',
      title: 'Security & Compliance',
      icon: Shield,
      cards: [
        {
          id: 'security',
          title: 'Security',
          description: 'Security settings and policies',
          url: '/company/settings/security',
          icon: Shield,
          buttonText: 'Manage Security',
        },
      ],
    },
  ];

  // Render a card for navigation
  const renderCard = (item: SettingsCard) => {
    const Icon = item.icon;
    const handleAction = () => {
      if (item.onClick) {
        item.onClick();
      } else if (item.url) {
        router.push(item.url);
      }
    };

    return (
      <Card
        key={item.id}
        className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col h-full"
        onClick={handleAction}
      >
        <CardHeader className="flex-1">
          <div className="flex items-center gap-3">
            <Icon className="h-6 w-6 text-zenthea-teal flex-shrink-0" />
            <CardTitle className="text-lg">{item.title}</CardTitle>
          </div>
          <CardDescription className="mt-2">{item.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              handleAction();
            }}
          >
            {item.buttonText}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <ClinicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-text-primary">Company Settings</h1>
          <p className="text-text-secondary mt-1">
            Manage your clinic&apos;s configuration and preferences
          </p>
        </div>

        {/* 3-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Logo and Company Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Logo Card */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  <PatientAvatarUpload
                    currentAvatar={companyLogo}
                    patientName={companyName}
                    onAvatarChange={() => {
                      // Expand the profile section when avatar is changed
                      if (!expandedSections.has('profile')) {
                        toggleSection('profile');
                      }
                      // Scroll to profile section
                      setTimeout(() => {
                        const profileSection = document.getElementById('section-company-profile');
                        if (profileSection) {
                          profileSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 100);
                    }}
                    disabled={!!isLoadingProfile}
                    helpText="Upload a professional company avatar. Supported formats: JPEG, PNG, GIF, WebP. Maximum size: 5MB."
                    variant="square"
                  />
                </div>
                <h3 className="font-semibold text-lg text-text-primary">
                  {companyName}
                </h3>
                {companyEmail && (
                  <p className="text-sm text-text-secondary mt-2">{companyEmail}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Content - Collapsible Sections */}
          <div className="lg:col-span-2 space-y-4">
            {/* Company Profile Section - At the top */}
            <div id="section-company-profile">
              <ProfileSection
                title="Company Profile"
                icon={Building2}
                isExpanded={expandedSections.has('profile')}
                onToggle={() => toggleSection('profile')}
              >
                <ClinicProfileEditor />
              </ProfileSection>
            </div>

            {/* Other Settings Sections */}
            {allSections.map((section) => (
              <ProfileSection
                key={section.id}
                title={section.title}
                icon={section.icon}
                isExpanded={expandedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {section.cards.map(renderCard)}
                </div>
              </ProfileSection>
            ))}
          </div>
        </div>
      </div>
    </ClinicLayout>
  );
}

