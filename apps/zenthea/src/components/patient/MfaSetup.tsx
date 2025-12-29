'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Shield, Smartphone, Mail, CheckCircle } from 'lucide-react';

interface MfaSetupProps {
  userId: string;
  onComplete: () => void;
}

export function MfaSetup({ userId, onComplete }: MfaSetupProps) {
  const [method, setMethod] = useState<'sms' | 'email' | 'app'>('sms');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [qrCode, setQrCode] = useState('');

  const handleSetupMfa = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/patient/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          method,
          phone: method === 'sms' ? phone : undefined,
          email: method === 'email' ? email : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to setup MFA');
      }

      const data = await response.json();
      
      if (method === 'app') {
        setQrCode(data.qrCode);
      }
      
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup MFA');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/patient/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          code: verificationCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid verification code');
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verify MFA Setup
          </CardTitle>
          <CardDescription>
            Enter the verification code to complete MFA setup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleVerifyMfa(); }} className="space-y-4">
            {error && (
              <Alert>
                {error}
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="verificationCode">Verification Code</Label>
              <Input
                id="verificationCode"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="text-center text-lg tracking-widest"
                maxLength={6}
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || verificationCode.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify & Complete Setup'}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Setup Multi-Factor Authentication
        </CardTitle>
        <CardDescription>
          Choose your preferred MFA method for enhanced security
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => { e.preventDefault(); handleSetupMfa(); }} className="space-y-4">
          {error && (
            <Alert>
              {error}
            </Alert>
          )}

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="sms"
                name="method"
                value="sms"
                checked={method === 'sms'}
                onChange={(e) => setMethod(e.target.value as 'sms')}
                className="h-4 w-4"
              />
              <Label htmlFor="sms" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                SMS Text Message
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="email"
                name="method"
                value="email"
                checked={method === 'email'}
                onChange={(e) => setMethod(e.target.value as 'email')}
                className="h-4 w-4"
              />
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="app"
                name="method"
                value="app"
                checked={method === 'app'}
                onChange={(e) => setMethod(e.target.value as 'app')}
                className="h-4 w-4"
              />
              <Label htmlFor="app" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Authenticator App (Google Authenticator, Authy, etc.)
              </Label>
            </div>
          </div>

          {method === 'sms' && (
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          )}

          {method === 'email' && (
            <div className="space-y-2">
              <Label htmlFor="email-address">Email Address</Label>
              <Input
                id="email-address"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          )}

          {method === 'app' && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                You&apos;ll be shown a QR code to scan with your authenticator app
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Setting up...' : 'Setup MFA'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
