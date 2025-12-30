'use client';

import { useState, Suspense } from "react";
import { signIn, getSession } from "@/hooks/useZentheaSession";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Star, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { config } from "@/lib/config";
import { testimonials } from "@/data/testimonials";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Link from "next/link";
import HeroImage from "@/components/HeroImage";
import Logo from "@/components/Logo";
import { COOKIE_PROPAGATION_DELAY, JUST_LOGGED_IN_COOKIE_MAX_AGE } from '@/lib/auth-constants';
import { parseCallbackUrl } from '@/lib/auth-utils';

function HomePageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
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
        tenantId: "demo-tenant",
        redirect: false,
      });

      console.log("SignIn result:", result);

      if (result?.error) {
        setError("Invalid credentials. Please try again.");
      } else if (result?.ok) {
        // Set a temporary cookie to signal to middleware that user just logged in
        // This gives the session cookie time to propagate to Edge Runtime
        document.cookie = `just-logged-in=true; path=/; max-age=${JUST_LOGGED_IN_COOKIE_MAX_AGE}; SameSite=Lax`;

        // Wait for cookie to be set
        await new Promise(resolve => setTimeout(resolve, COOKIE_PROPAGATION_DELAY));
        
        // Get the session to check user role
        const session = await getSession();
        console.log("Session after login:", session);
        
        // Check for callbackUrl from query parameters
        const callbackUrl = searchParams.get('callbackUrl');
        let finalRedirect: string | null = null;
        
        if (callbackUrl) {
          try {
            // Use shared utility to parse callbackUrl
            const redirectPath = parseCallbackUrl(callbackUrl, window.location.hostname);
            
            // Validate that the callback path matches the user's role
            if (redirectPath && session?.user?.role) {
              const rolePathMap: Record<string, string[]> = {
                admin: ['/admin'],
                provider: ['/provider'],
                patient: ['/patient'],
                demo: ['/demo'],
                super_admin: ['/superadmin'],
                clinic_user: ['/company'],
              };
              
              const allowedPaths = rolePathMap[session.user.role] || [];
              const isAllowedPath = allowedPaths.some(path => redirectPath.startsWith(path));
              
              if (isAllowedPath) {
                finalRedirect = redirectPath;
                console.log("Using callbackUrl:", finalRedirect);
              } else {
                console.warn('Callback URL does not match user role, ignoring:', redirectPath);
              }
            } else if (redirectPath) {
              // If no role check needed or no session, use callbackUrl
              finalRedirect = redirectPath;
            }
          } catch (e) {
            console.warn('Invalid callbackUrl:', callbackUrl, e);
          }
        }
        
        // If no valid callbackUrl, redirect based on user role
        if (!finalRedirect) {
          const userRole = session?.user?.role;
          if (userRole === 'patient') {
            finalRedirect = "/patient/calendar?tab=today";
          } else if (userRole === 'super_admin') {
            finalRedirect = "/superadmin";
          } else {
            // Clinic users (admin, provider, clinic_user) go to company calendar
            finalRedirect = "/company/calendar?tab=today";
          }
        }
        
        console.log("Redirecting to:", finalRedirect);
        
        // Use window.location for full page reload to ensure fresh middleware check
        window.location.href = finalRedirect;
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setError("An error occurred during sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

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
                className="text-sm text-zenthea-teal hover:underline"
              >
                Forgot password
              </button>
            </div>

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

            <Button type="button" variant="outline" className="w-full h-12 border-border-primary text-text-primary hover:bg-surface-elevated" style={{display: 'none'}}>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </Button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center" style={{display: 'none'}}>
            <p className="text-text-secondary">
              Don&apos;t have an account?{" "}
              <Link href="/landing" className="text-zenthea-teal hover:underline font-medium">
                Sign up for free
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Testimonial */}
      <div className="flex-1 relative bg-gradient-to-br from-zenthea-teal to-zenthea-purple">
        {/* Background Image */}
        <HeroImage />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Testimonial Content */}
        <div className="relative z-10 flex items-end justify-center h-full p-8" style={{display: 'none'}}>
          <div className="max-w-md text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20">
              <div className="text-white">
                {testimonials?.[currentTestimonial] && (
                  <>
                    <p className="text-lg mb-6 italic">
                      &ldquo;{testimonials[currentTestimonial]!.quote}&rdquo;
                    </p>
                    
                    <div className="flex items-center justify-center mb-4">
                      {[...Array(testimonials[currentTestimonial]!.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current text-status-warning" />
                      ))}
                    </div>
                    
                    <div className="mb-4">
                      <p className="font-semibold text-lg">{testimonials[currentTestimonial]!.author}</p>
                      <p className="text-white/80 text-sm">{testimonials[currentTestimonial]!.title}</p>
                    </div>
                  </>
                )}
                
                {/* Navigation Arrows */}
                <div className="flex items-center justify-center space-x-4">
                  <button
                    onClick={prevTestimonial}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-white" />
                  </button>
                  <button
                    onClick={nextTestimonial}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zenthea-teal" />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}