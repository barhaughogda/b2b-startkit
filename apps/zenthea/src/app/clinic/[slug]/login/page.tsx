"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, getSession } from "next-auth/react";
import { useTenantPublicData } from "@/hooks/useTenantPublicData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, AlertCircle, UserCircle, Stethoscope } from "lucide-react";
import { parseCallbackUrl } from "@/lib/auth-utils";
import { ROLE_PATH_MAP } from "@/lib/auth-constants";
import { getThemeStyles, getFontUrl } from "@/lib/website-builder/theme-utils";

/**
 * Tenant-Specific Login Page
 * 
 * This page allows users to login specifically to a tenant's portal.
 * The tenant ID is automatically set based on the URL slug.
 * 
 * Handles both patient and provider logins with role-based redirects:
 * - Patients: Redirected to booking flow, intake form, or patient dashboard
 * - Providers: Redirected to company calendar (today tab)
 * 
 * Supports a `redirect` query parameter for post-login navigation.
 */
export default function TenantLoginPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  
  // Get redirect destination from query params (default varies by role)
  const redirectTo = searchParams?.get('redirect');
  
  const { tenant, isLoading, notFound } = useTenantPublicData(slug);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginMode, setLoginMode] = useState<'patient' | 'provider'>('patient');

  // Determine which theme to use: website builder theme (if published) or fallback to branding
  // Must be calculated before early returns to ensure hooks are called consistently
  const websiteBuilder = tenant?.websiteBuilder;
  const hasPublishedWebsiteBuilder = websiteBuilder?.publishedAt != null;
  const theme = hasPublishedWebsiteBuilder && websiteBuilder?.theme 
    ? websiteBuilder.theme 
    : null;

  // Load Google Fonts if website builder theme is available
  // This hook must be called before any early returns to comply with Rules of Hooks
  useEffect(() => {
    if (theme?.fontPair) {
      const fontUrl = getFontUrl(theme.fontPair);
      const fontLinkId = 'login-page-google-fonts';
      let link = document.getElementById(fontLinkId) as HTMLLinkElement | null;
      
      if (!link) {
        link = document.createElement('link');
        link.id = fontLinkId;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      
      link.href = fontUrl;
    }
  }, [theme?.fontPair]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  // Not found state
  if (notFound || !tenant) {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">Clinic Not Found</h1>
          <Link href="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Helper function to log authentication events for HIPAA compliance
    const logAuthEvent = async (action: 'login_success' | 'login_failed', errorMessage?: string) => {
      try {
        await fetch('/api/auth/audit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
            email,
            tenantId: tenant.id,
            errorMessage,
            // IP and user agent will be captured server-side from request headers
          }),
        });
      } catch (auditError) {
        // Don't fail login if audit logging fails - log error but continue
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to log authentication event:', auditError);
        }
      }
    };

    try {
      const result = await signIn("credentials", {
        email,
        password,
        tenantId: tenant.id, // Use the tenant's actual ID
        redirect: false,
      });

      if (result?.error) {
        // HIPAA Compliance: Log failed authentication attempt
        await logAuthEvent('login_failed', result.error);
        
        // Check for specific error messages
        if (result.error.includes("wrong portal") || result.error.includes("not found")) {
          setError("Your account is not associated with this clinic. Please check your login credentials or contact support.");
        } else if (result.error.includes("Invalid credentials")) {
          setError("Invalid email or password. Please try again.");
        } else {
          setError(result.error);
        }
      } else if (result?.ok) {
        // Set a temporary cookie to signal to middleware that user just logged in
        // This gives the session cookie time to propagate to Edge Runtime
        document.cookie = `just-logged-in=true; path=/; max-age=600; SameSite=Lax`;

        // Wait for cookie to be set
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get the session to determine user role
        const session = await getSession();
        const userRole = session?.user?.role;
        
        // HIPAA Compliance: Log successful authentication
        await logAuthEvent('login_success');
        
        // Determine default redirect based on role
        let finalRedirect: string;
        if (userRole === 'patient') {
          finalRedirect = "/patient/calendar?tab=today";
        } else {
          // For providers/staff: go to company calendar (today tab)
          finalRedirect = "/company/calendar?tab=today";
        }
        
        // Validate redirectTo parameter against user role if provided
        // Security: Validate redirect to prevent open redirect vulnerabilities
        // and ensure users are redirected to appropriate paths for their role
        if (redirectTo) {
          try {
            const redirectPath = parseCallbackUrl(redirectTo, window.location.hostname);
            
            if (redirectPath && userRole) {
              // Validate that the redirect path matches the user's role
              // This prevents unauthorized access and open redirect attacks
              const allowedPaths = ROLE_PATH_MAP[userRole] || [];
              const isAllowedPath = allowedPaths.some(path => redirectPath.startsWith(path));
              
              if (isAllowedPath) {
                finalRedirect = redirectPath;
              } else if (process.env.NODE_ENV === 'development') {
                console.warn('Redirect URL does not match user role, using default:', redirectPath, 'for role:', userRole);
              }
            } else if (redirectPath) {
              // If no role check needed, use redirectPath
              finalRedirect = redirectPath;
            }
          } catch (e) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Invalid redirect URL:', redirectTo, e);
            }
          }
        }
        
        // Use window.location for full page reload to ensure fresh middleware check
        window.location.href = finalRedirect;
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use website builder theme if available, otherwise fallback to branding
  const primaryColor = theme?.primaryColor || tenant.branding.primaryColor;
  const secondaryColor = theme?.secondaryColor || tenant.branding.secondaryColor;
  const backgroundColor = theme?.backgroundColor || '#ffffff';
  const textColor = theme?.textColor || '#1a1a1a';
  
  // Generate theme CSS variables if website builder theme is available
  const themeStyles = theme ? getThemeStyles(theme) : {};

  const { branding } = tenant;

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: backgroundColor,
        color: textColor,
        ...themeStyles,
      } as React.CSSProperties}
    >
      {/* Header */}
      <header className="border-b border-border-primary" style={{ backgroundColor: backgroundColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href={`/clinic/${slug}`}
            className="inline-flex items-center transition-colors hover:opacity-80"
            style={{ color: primaryColor }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {tenant.name}
          </Link>
        </div>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {branding.logo ? (
                <img 
                  src={branding.logo} 
                  alt={`${tenant.name} logo`}
                  className="h-12 w-auto"
                />
              ) : (
                <div 
                  className="h-12 w-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {tenant.name.charAt(0)}
                </div>
              )}
            </div>
            <CardTitle>Sign in to {tenant.name}</CardTitle>
            <CardDescription style={{ color: primaryColor }}>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Login Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <Button
                type="button"
                variant={loginMode === 'patient' ? 'default' : 'outline'}
                className="flex-1"
                style={loginMode === 'patient' ? { backgroundColor: primaryColor } : undefined}
                onClick={() => setLoginMode('patient')}
              >
                <UserCircle className="mr-2 h-4 w-4" />
                Patient
              </Button>
              <Button
                type="button"
                variant={loginMode === 'provider' ? 'default' : 'outline'}
                className="flex-1"
                style={loginMode === 'provider' ? { backgroundColor: primaryColor } : undefined}
                onClick={() => setLoginMode('provider')}
              >
                <Stethoscope className="mr-2 h-4 w-4" />
                Staff
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-status-error/10 border border-status-error/20 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-status-error flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-status-error">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full"
                style={{ backgroundColor: primaryColor }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  `Sign In as ${loginMode === 'patient' ? 'Patient' : 'Staff'}`
                )}
              </Button>
            </form>

            {/* Patient-specific options */}
            {loginMode === 'patient' && (
              <div className="mt-6 text-center text-sm space-y-3" style={{ color: primaryColor }}>
                <p>
                  New patient?{" "}
                  <Link 
                    href={`/clinic/${slug}/register${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
                    className="font-medium hover:underline"
                    style={{ color: primaryColor }}
                  >
                    Create an account
                  </Link>
                </p>
              </div>
            )}

            {/* Staff-specific options */}
            {loginMode === 'provider' && (
              <div className="mt-6 text-center text-sm text-text-secondary">
                <p>
                  Staff accounts are created by invitation only.
                  Contact your administrator if you need access.
                </p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border-primary text-center text-sm" style={{ color: primaryColor }}>
              <p>
                Need help?{" "}
                <a 
                  href={`mailto:${tenant.contactInfo.email}`}
                  className="font-medium hover:underline"
                  style={{ color: primaryColor }}
                >
                  Contact Support
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-primary py-6" style={{ backgroundColor: backgroundColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm" style={{ color: textColor, opacity: 0.7 }}>
          <p>© {new Date().getFullYear()} {tenant.name}. Powered by <a href="https://zenthea.ai" className="hover:underline">Zenthea</a></p>
        </div>
      </footer>
    </div>
  );
}

