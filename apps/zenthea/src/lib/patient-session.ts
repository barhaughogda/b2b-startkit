import { getZentheaServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export interface PatientSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
}

export async function getPatientSession(): Promise<PatientSession | null> {
  const session = await getZentheaServerSession();
  
  if (!session || session.user.role !== 'patient') {
    return null;
  }
  
  return session as PatientSession;
}

export async function requirePatientAuth(): Promise<PatientSession> {
  const session = await getPatientSession();
  
  if (!session) {
    redirect('/patient/login?error=AccessDenied');
  }
  
  return session;
}

export async function getPatientTenantId(): Promise<string | null> {
  const session = await getPatientSession();
  return session?.user.tenantId || null;
}

export function createSecureCookie(name: string, value: string, options: {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
} = {}) {
  const {
    maxAge = 24 * 60 * 60, // 24 hours
    httpOnly = true,
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'lax',
    path = '/'
  } = options;

  return `${name}=${value}; Max-Age=${maxAge}; HttpOnly=${httpOnly}; Secure=${secure}; SameSite=${sameSite}; Path=${path}`;
}

export function clearSecureCookie(name: string) {
  return `${name}=; Max-Age=0; HttpOnly=true; Secure=${process.env.NODE_ENV === 'production'}; SameSite=lax; Path=/`;
}

export function generateSecureToken(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function validateToken(token: string, hashedToken: string): boolean {
  return hashToken(token) === hashedToken;
}

export interface PatientSessionData {
  userId: string;
  tenantId: string;
  role: string;
  mfaEnabled: boolean;
  lastActivity: number;
  sessionToken: string;
}

export function createPatientSessionData(user: {
  id: string;
  tenantId: string;
  role: string;
  mfaEnabled?: boolean;
}): PatientSessionData {
  return {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    mfaEnabled: user.mfaEnabled || false,
    lastActivity: Date.now(),
    sessionToken: generateSecureToken(),
  };
}

export function isSessionValid(sessionData: PatientSessionData, maxAge: number = 24 * 60 * 60 * 1000): boolean {
  const now = Date.now();
  return (now - sessionData.lastActivity) < maxAge;
}

export function updateSessionActivity(sessionData: PatientSessionData): PatientSessionData {
  return {
    ...sessionData,
    lastActivity: Date.now(),
  };
}
