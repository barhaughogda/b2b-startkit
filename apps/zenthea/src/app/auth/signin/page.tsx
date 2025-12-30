"use client";

import { useState, Suspense } from "react";
import { signIn, getSession } from "@/hooks/useZentheaSession";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, HelpCircle } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import HeroImage from "@/components/HeroImage";
import Logo from "@/components/Logo";
import { COOKIE_PROPAGATION_DELAY, JUST_LOGGED_IN_COOKIE_MAX_AGE } from '@/lib/auth-constants';
import { parseCallbackUrl } from '@/lib/auth-utils';

function SignInPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        tenantId: tenantId || undefined,
        mfaCode: showMfa ? mfaCode : undefined,
        redirect: false,
      });

      if (result?.error) {
        // Check if error indicates MFA is required
        // Use structured error checking for better reliability
        const errorMessage = result.error;
        const errorLower = errorMessage.toLowerCase();
        
        // Check for MFA-related errors
        if (
          errorMessage === 'MFA_REQUIRED' ||
          errorLower.includes("mfa_required") ||
          (errorLower.includes("mfa") && !errorLower.includes("rate limit"))
        ) {
          setShowMfa(true);
          setError("");
          return;
        }
        
        // Check for MFA rate limit errors
        if (errorLower.includes("too many mfa verification attempts") || 
            errorLower.includes("mfa") && errorLower.includes("rate limit")) {
          setError(errorMessage);
          return;
        }
        
        // Check for password expired
        if (errorLower.includes("password_expired")) {
          // Password has expired - redirect to password change page
          // Store email and tenantId in sessionStorage for password change page
          sessionStorage.setItem("passwordChangeEmail", email);
          sessionStorage.setItem("passwordChangeTenantId", tenantId || "");
          router.push("/auth/change-password?expired=true");
          return;
        } else if (errorMessage.includes("account_locked")) {
          // Account is locked - extract minutes remaining
          const match = result.error.match(/account_locked:(\d+)/i);
          const minutesRemaining = match && match[1] ? parseInt(match[1], 10) : null;
          if (minutesRemaining !== null) {
            setError(`Account locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`);
          } else {
            setError("Account locked due to too many failed login attempts. Please try again later or contact your administrator.");
          }
        } else {
          setError("Invalid credentials. Please try again.");
        }
      } else if (result?.ok) {
        // Set a temporary cookie to signal to middleware that user just logged in
        // This gives the session cookie time to propagate to Edge Runtime
        document.cookie = `just-logged-in=true; path=/; max-age=${JUST_LOGGED_IN_COOKIE_MAX_AGE}; SameSite=Lax`;

        // Wait for cookie to be set
        await new Promise(resolve => setTimeout(resolve, COOKIE_PROPAGATION_DELAY));
        
        // Get the session to check user role
        const session = await getSession();
        
        // Check for callbackUrl from query parameters
        const callbackUrl = searchParams.get('callbackUrl');
        const userRole = session?.user?.role;
        
        // Determine default redirect based on user role
        let finalRedirect: string;
        if (userRole === 'patient') {
          finalRedirect = '/patient/calendar?tab=today';
        } else if (userRole === 'admin') {
          finalRedirect = '/company/dashboard';
        } else if (userRole === 'provider') {
          finalRedirect = '/company/today';
        } else if (userRole === 'super_admin') {
          finalRedirect = '/superadmin';
        } else {
          // Clinic users (clinic_user, etc.) go to company calendar
          finalRedirect = '/company/calendar?tab=today';
        }
        
        // Handle callbackUrl if provided
        if (callbackUrl) {
          try {
            // Use shared utility to parse callbackUrl
            const redirectPath = parseCallbackUrl(callbackUrl, window.location.hostname);
            
            if (redirectPath && session?.user?.role) {
              // Validate that the callback path matches the user's role
              const rolePathMap: Record<string, string[]> = {
                admin: ['/company'],
                provider: ['/company'],
                patient: ['/patient'],
                demo: ['/demo'],
                super_admin: ['/superadmin'],
                clinic_user: ['/company'],
              };
              
              const allowedPaths = rolePathMap[session.user.role] || [];
              const isAllowedPath = allowedPaths.some(path => redirectPath.startsWith(path));
              
              if (isAllowedPath) {
                finalRedirect = redirectPath;
              } else if (process.env.NODE_ENV === 'development') {
                // Only warn in development
                console.warn('Callback URL does not match user role, ignoring:', redirectPath);
              }
            } else if (redirectPath) {
              // If no role check needed or no session, use callbackUrl
              finalRedirect = redirectPath;
            }
          } catch (e) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Invalid callbackUrl:', callbackUrl, e);
            }
          }
        }
        
        // Use window.location for full page reload to ensure fresh middleware check
        window.location.href = finalRedirect;
      }
    } catch (error: any) {
      // Check if error indicates MFA is required
      if (error?.message === "MFA_REQUIRED" || error?.message?.includes("MFA")) {
        setShowMfa(true);
        setError("");
      } else if (error?.message === "PASSWORD_EXPIRED" || error?.message?.includes("PASSWORD_EXPIRED")) {
        // Password has expired - redirect to password change page
        sessionStorage.setItem("passwordChangeEmail", email);
        sessionStorage.setItem("passwordChangeTenantId", tenantId || "");
        router.push("/auth/change-password?expired=true");
        return;
      } else {
        setError("An error occurred during sign in. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        tenantId: tenantId || undefined,
        mfaCode,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid MFA code. Please try again.");
      } else if (result?.ok) {
        // Set a temporary cookie to signal to middleware that user just logged in
        // This gives the session cookie time to propagate to Edge Runtime
        document.cookie = `just-logged-in=true; path=/; max-age=${JUST_LOGGED_IN_COOKIE_MAX_AGE}; SameSite=Lax`;

        // Wait for cookie to be set
        await new Promise(resolve => setTimeout(resolve, COOKIE_PROPAGATION_DELAY));
        
        // Get user role from session to determine redirect
        const session = await getSession();
        const userRole = session?.user?.role;
        
        // Determine default redirect based on user role
        let finalRedirect: string;
        if (userRole === 'patient') {
          finalRedirect = '/patient/calendar?tab=today';
        } else {
          // Clinic users (admin, provider, clinic_user) go to company calendar
          finalRedirect = '/company/calendar';
        }
        
        // Check for callbackUrl from query parameters
        const callbackUrl = searchParams.get('callbackUrl');
        
        // Handle callbackUrl if provided
        if (callbackUrl) {
          try {
            // Use shared utility to parse callbackUrl
            const redirectPath = parseCallbackUrl(callbackUrl, window.location.hostname);
            
            if (redirectPath) {
              // Validate callbackUrl matches user role
              if (userRole === 'patient' && redirectPath.startsWith('/patient')) {
                finalRedirect = redirectPath;
              } else if (userRole !== 'patient' && redirectPath.startsWith('/company')) {
                finalRedirect = redirectPath;
              }
              // If callbackUrl doesn't match role, use default redirect
            }
          } catch (e) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Invalid callbackUrl:', callbackUrl, e);
            }
          }
        }
        
        // Use window.location for full page reload to ensure fresh middleware check
        window.location.href = finalRedirect;
      }
    } catch (error) {
      setError("An error occurred during MFA verification. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Show MFA input if MFA is required
  if (showMfa) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Multi-Factor Authentication</CardTitle>
              <CardDescription className="text-center">
                Enter the 6-digit code from your authenticator app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMfaSubmit} className="space-y-4">
                {error && (
                  <Alert>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="mfaCode">Authentication Code</Label>
                  <Input
                    id="mfaCode"
                    type="text"
                    placeholder="000000"
                    value={mfaCode}
                    onChange={(e) => {
                      // Only allow digits and limit to 6 characters
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setMfaCode(value);
                    }}
                    required
                    maxLength={6}
                    autoFocus
                    className="text-center text-2xl tracking-widest"
                  />
                  <p className="text-xs text-text-secondary text-center">
                    Enter the 6-digit code from your authenticator app, or use a backup code
                  </p>
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading || mfaCode.length !== 6}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Code"
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowMfa(false);
                    setMfaCode("");
                    setError("");
                  }}
                  disabled={isLoading}
                >
                  Back to Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex">
        {/* Left Side - Login Form */}
        <div className="flex-1 flex items-center justify-center bg-white px-8 py-12">
          <div className="w-full max-w-md">
            {/* Logo */}
            <div className="flex items-center mb-8">
              <Logo 
                alt="Zenthea Logo" 
                className="h-[50px] w-auto"
              />
            </div>

            {/* Welcome Text */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-text-primary mb-2">Welcome back</h1>
              <p className="text-text-secondary">Please enter your details.</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-text-secondary hover:text-text-primary" />
                    ) : (
                      <Eye className="h-4 w-4 text-text-secondary hover:text-text-primary" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenantId">Tenant ID (Optional)</Label>
                <Input
                  id="tenantId"
                  type="text"
                  placeholder="Enter tenant ID"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="h-12"
                />
              </div>

              {/* Remember Me and Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-zenthea-teal focus:ring-zenthea-teal border-border-primary rounded"
                  />
                  <Label htmlFor="remember" className="text-sm text-text-secondary">
                    Remember for 30 days
                  </Label>
                </div>
                <button
                  type="button"
                  className="text-sm text-zenthea-teal hover:underline flex items-center gap-1"
                  onClick={() => setShowForgotPassword(!showForgotPassword)}
                >
                  <HelpCircle className="h-4 w-4" />
                  Forgot password
                </button>
              </div>

              {showForgotPassword && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Password Reset Instructions:</strong>
                  </p>
                  <ul className="text-xs text-blue-700 mt-1 space-y-1">
                    <li>• Contact your system administrator for password reset</li>
                    <li>• For demo accounts, use the credentials shown below</li>
                    <li>• Ensure you&apos;re using the correct email and tenant ID</li>
                  </ul>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:text-blue-800 mt-2"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Close
                  </button>
                </div>
              )}

              <Button type="submit" className="w-full h-12 bg-zenthea-teal hover:bg-zenthea-teal-600 text-white" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Side - Hero Image */}
        <div className="flex-1 relative bg-gradient-to-br from-zenthea-teal to-zenthea-purple">
          {/* Background Image */}
          <HeroImage />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" />
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zenthea-teal" />
      </div>
    }>
      <SignInPageContent />
    </Suspense>
  );
}
