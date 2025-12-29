'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';
import { parseCallbackUrl } from '@/lib/auth-utils';
import { COOKIE_PROPAGATION_DELAY, JUST_LOGGED_IN_COOKIE_MAX_AGE } from '@/lib/auth-constants';

interface PatientLoginFormProps {
  tenantId?: string;
  redirectTo?: string;
}

function PatientLoginFormContent({ tenantId, redirectTo = '/company/calendar' }: PatientLoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        tenantId: tenantId || '',
        redirect: false,
      });

      if (result?.error) {
        if (result.error === 'MFA_REQUIRED') {
          setShowMfa(true);
          setError('');
        } else {
          setError('Invalid email or password. Please try again.');
        }
      } else if (result?.ok) {
        // Set a temporary cookie to signal to middleware that user just logged in
        // This gives the session cookie time to propagate to Edge Runtime
        document.cookie = `just-logged-in=true; path=/; max-age=${JUST_LOGGED_IN_COOKIE_MAX_AGE}; SameSite=Lax`;

        // Wait for cookie to be set
        await new Promise(resolve => setTimeout(resolve, COOKIE_PROPAGATION_DELAY));

        // Check for callbackUrl from query parameters
        const callbackUrl = searchParams.get('callbackUrl');

        // Patient users redirect to patient calendar
        let finalRedirect = '/patient/calendar?tab=today';

        if (callbackUrl) {
          try {
            // Use shared utility to parse callbackUrl
            const redirectPath = parseCallbackUrl(callbackUrl, window.location.hostname);

            // Only allow patient routes for security
            if (redirectPath && redirectPath.startsWith('/patient')) {
              finalRedirect = redirectPath;
            }
          } catch (e) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Invalid callbackUrl:', callbackUrl, e);
            }
          }
        }

        window.location.href = finalRedirect;
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        tenantId: tenantId || '',
        mfaCode,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid MFA code. Please try again.');
      } else if (result?.ok) {
        // Set a temporary cookie to signal to middleware that user just logged in
        // This gives the session cookie time to propagate to Edge Runtime
        document.cookie = `just-logged-in=true; path=/; max-age=${JUST_LOGGED_IN_COOKIE_MAX_AGE}; SameSite=Lax`;

        // Wait for cookie to be set
        await new Promise(resolve => setTimeout(resolve, COOKIE_PROPAGATION_DELAY));

        // Check for callbackUrl from query parameters
        const callbackUrl = searchParams.get('callbackUrl');

        // Patient users redirect to patient calendar
        let finalRedirect = '/patient/calendar?tab=today';

        if (callbackUrl) {
          try {
            // Use shared utility to parse callbackUrl
            const redirectPath = parseCallbackUrl(callbackUrl, window.location.hostname);

            // Only allow patient routes for security
            if (redirectPath && redirectPath.startsWith('/patient')) {
              finalRedirect = redirectPath;
            }
          } catch (e) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Invalid callbackUrl:', callbackUrl, e);
            }
          }
        }

        window.location.href = finalRedirect;
      }
    } catch (err) {
      setError('An error occurred during MFA verification. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showMfa) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Multi-Factor Authentication
          </CardTitle>
          <CardDescription>
            Please enter the verification code sent to your registered device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            {error && (
              <Alert>
                {error}
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="mfaCode">Verification Code</Label>
              <Input
                id="mfaCode"
                type="text"
                placeholder="Enter 6-digit code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                className="text-center text-lg tracking-widest"
                maxLength={6}
                required
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowMfa(false)}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading || mfaCode.length !== 6}
              >
                {isLoading ? 'Verifying...' : 'Verify'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Sign In</CardTitle>
        <CardDescription>
          Enter your credentials to access your patient portal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert>
              {error}
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function PatientLoginForm(props: PatientLoginFormProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PatientLoginFormContent {...props} />
    </Suspense>
  );
}
