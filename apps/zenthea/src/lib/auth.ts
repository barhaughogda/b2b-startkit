import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { ConvexHttpClient } from "convex/browser";
import { Id } from "@/convex/_generated/dataModel";
import { NEXTAUTH_SESSION_COOKIE_NAME, NEXTAUTH_CALLBACK_URL_COOKIE_NAME } from "./auth-constants";
import { verifyTOTP, validateTOTPCodeFormat, validateBackupCodeFormat, decryptTOTPSecret } from "./mfa";

// Validate required environment variables
function validateAuthConfig() {
  const errors: string[] = [];
  
  if (!process.env.NEXTAUTH_URL) {
    errors.push("Missing NEXTAUTH_URL environment variable");
  } else {
    // Validate URL format
    try {
      const url = new URL(process.env.NEXTAUTH_URL);
      if (url.pathname !== '/') {
        errors.push("NEXTAUTH_URL should not have a trailing slash or path");
      }
    } catch {
      errors.push("NEXTAUTH_URL must be a valid URL (e.g., http://localhost:4800 or https://yourdomain.com)");
    }
  }
  
  if (!process.env.NEXTAUTH_SECRET) {
    errors.push("Missing NEXTAUTH_SECRET environment variable");
  } else if (process.env.NEXTAUTH_SECRET.length < 32) {
    errors.push("NEXTAUTH_SECRET must be at least 32 characters long");
  }
  
  if (errors.length > 0) {
    const errorMessage = `NextAuth Configuration Errors:\n${errors.map(e => `  - ${e}`).join('\n')}\n\nPlease check your .env.local file and ensure all required variables are set.`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMessage);
    } else {
      // In development, only warn - don't block initialization
      // NextAuth will handle missing config gracefully
      console.warn(errorMessage);
    }
  }
}

// Validate configuration on module load (non-blocking in development)
// NextAuth will validate at runtime, so we just warn here
if (process.env.NODE_ENV === 'production') {
  validateAuthConfig();
} else {
  // In development, validate but don't throw
  try {
    validateAuthConfig();
  } catch (error) {
    console.warn('Auth config validation warning:', error);
  }
}

// Convex API with intelligent fallback system
let api: any = null;
let convex: ConvexHttpClient | null = null;

// Lazy initialization function for Convex
async function initializeConvex() {
  if (convex && api) {
    return { convex, api };
  }

  try {
    // Try to import the generated API
    const convexApi = require("../../convex/_generated/api");
    api = convexApi.api;
    
    // Initialize Convex client if URL is available
    if (process.env.NEXT_PUBLIC_CONVEX_URL) {
      const { ConvexHttpClient } = await import("convex/browser");
      convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    }

    // Validate API structure
    if (!api || typeof api !== 'object') {
      throw new Error("Invalid API structure");
    }

    return { convex, api };
  } catch (error) {
    console.warn("Convex not available - authentication will fail without Convex");
    
    // Return null - no fallback
    api = null;
    convex = null;
    
    return { convex, api };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantId: { label: "Tenant ID", type: "text" },
        mfaCode: { label: "MFA Code", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("Missing email or password");
          return null;
        }

        // ONLY authenticate against Convex - no hardcoded demo users
        const { convex: convexClient, api: convexApi } = await initializeConvex();
        
        if (!convexClient || !convexApi) {
          console.error("Convex not available - authentication requires Convex");
          return null;
        }

        try {
          // For superadmin users, don't require tenantId
          // For other users, default to demo-tenant if not provided
          // Pass undefined to let authenticateUser handle tenant lookup logic
          const tenantId = credentials.tenantId || undefined;
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`🔐 Attempting authentication for: ${credentials.email}, tenant: ${tenantId}`);
            console.log(`🔐 Convex URL: ${process.env.NEXT_PUBLIC_CONVEX_URL}`);
            console.log(`🔐 Convex client initialized: ${!!convexClient}`);
            console.log(`🔐 Convex API available: ${!!convexApi}`);
          }
          
          // Authenticate user with Convex
          // authenticateUser will try multiple tenantId values including empty string for superadmin
          const result = await convexClient.action(convexApi.users.authenticateUser, {
            email: credentials.email,
            password: credentials.password,
            tenantId: tenantId,
          });

          if (process.env.NODE_ENV === 'development') {
            console.log(`🔐 Authentication result:`, JSON.stringify(result, null, 2));
          }

          if (result.success && result.user) {
            if (process.env.NODE_ENV === 'development') {
              console.log("✅ Authenticated via Convex:", result.user.email, "Role:", result.user.role);
            }
            
            // Check if MFA is enabled
            const mfaEnabled = result.user.mfaEnabled || false;
            
            if (mfaEnabled) {
              // MFA is enabled - require MFA code
              if (!credentials.mfaCode) {
                if (process.env.NODE_ENV === 'development') {
                  console.log("🔐 MFA enabled but no code provided");
                }
                // Throw error to indicate MFA is required
                // NextAuth will catch this and return error to client
                throw new Error("MFA_REQUIRED");
              }
              
              // Check if the code matches backup code format first
              const isBackupCodeFormat = validateBackupCodeFormat(credentials.mfaCode);
              
              if (isBackupCodeFormat) {
                // Code matches backup code format - verify as backup code
                try {
                  await convexClient.action(convexApi.mfa.verifyBackupCode, {
                    userId: result.user._id,
                    code: credentials.mfaCode,
                  });
                  // Backup code is valid, continue
                  if (process.env.NODE_ENV === 'development') {
                    console.log("✅ Backup code verified");
                  }
                } catch (backupError) {
                  // Backup code verification failed
                  if (process.env.NODE_ENV === 'development') {
                    console.log("❌ Invalid backup code");
                  }
                  throw new Error("Invalid MFA code");
                }
              } else {
                // Code doesn't match backup code format - validate and verify as TOTP
                if (!validateTOTPCodeFormat(credentials.mfaCode)) {
                  if (process.env.NODE_ENV === 'development') {
                    console.log("❌ Invalid MFA code format (not TOTP or backup code)");
                  }
                  throw new Error("Invalid MFA code format");
                }
                
                // Get user's MFA settings to verify code
                const userWithMFA = await convexClient.query(convexApi.users.getUser, {
                  id: result.user._id,
                });
                
                if (!userWithMFA || !userWithMFA.mfaSettings?.enabled) {
                  throw new Error("MFA not properly configured");
                }
                
                // Decrypt the TOTP secret
                let decryptedSecret: string;
                try {
                  decryptedSecret = await decryptTOTPSecret(
                    userWithMFA.mfaSettings.secret!,
                    result.user._id
                  );
                } catch (error) {
                  console.error("❌ Failed to decrypt TOTP secret:", error);
                  throw new Error("MFA verification failed");
                }
                
                // Check rate limit before verifying TOTP code
                try {
                  await convexClient.mutation(convexApi.mfa.checkMFAVerificationRateLimit, {
                    userId: result.user._id,
                  });
                } catch (rateLimitError: any) {
                  // Rate limit exceeded - throw error with rate limit message
                  if (rateLimitError?.message?.includes("Too many MFA verification attempts")) {
                    throw new Error(rateLimitError.message);
                  }
                  // If rate limit check fails for other reasons, log but continue
                  console.warn("⚠️ MFA rate limit check failed:", rateLimitError);
                }

                // Verify TOTP code
                const isValidCode = verifyTOTP(decryptedSecret, credentials.mfaCode);
                
                if (!isValidCode) {
                  if (process.env.NODE_ENV === 'development') {
                    console.log("❌ Invalid TOTP code");
                  }
                  // Rate limit is already incremented, just throw error
                  throw new Error("Invalid MFA code");
                }
                
                // TOTP code is valid, update lastVerifiedAt and reset rate limit
                try {
                  await convexClient.action(convexApi.mfa.confirmTOTPVerification, {
                    userId: result.user._id,
                    code: credentials.mfaCode,
                  });
                  if (process.env.NODE_ENV === 'development') {
                    console.log("✅ TOTP code verified");
                  }
                } catch (error) {
                  // Log error but don't fail authentication if verification timestamp update fails
                  console.warn("⚠️ Failed to update MFA verification timestamp:", error);
                }
              }
            }
            
            // Check if password has expired
            if (result.user.passwordExpired) {
              if (process.env.NODE_ENV === 'development') {
                console.log("🔐 Password expired - requiring change");
              }
              // Throw error to indicate password change is required
              // NextAuth will catch this and return error to client
              throw new Error("PASSWORD_EXPIRED");
            }
            
            // Map admin/provider roles to clinic_user for new access system
            // Keep original role for backward compatibility during migration
            const originalRole = result.user.role;
            const normalizedRole = (originalRole === 'admin' || originalRole === 'provider') 
              ? 'clinic_user' 
              : originalRole;
            
            // HIPAA Compliance: Log successful authentication
            try {
              // Validate Convex ID format for type safety
              // Convex IDs are base64url-encoded strings (typically 15-30 characters)
              const isValidConvexId = (id: string): boolean => {
                return /^[a-zA-Z0-9_-]{15,}$/.test(id);
              };

              // Type-safe userId handling with proper validation
              const validatedUserId: Id<'users'> | undefined = 
                isValidConvexId(result.user._id)
                  ? (result.user._id as Id<'users'>)
                  : undefined;

              await convexClient.mutation(convexApi.auditLogs.create, {
                tenantId: result.user.tenantId || 'default',
                userId: validatedUserId,
                action: 'login_success',
                resource: 'authentication',
                resourceId: result.user._id,
                details: {
                  email: result.user.email,
                  role: normalizedRole,
                  originalRole: originalRole,
                  mfaUsed: mfaEnabled,
                  timestamp: Date.now(),
                  source: 'nextauth_authorize',
                },
                ipAddress: undefined, // IP will be captured by middleware/client
                userAgent: undefined, // User agent will be captured by middleware/client
                timestamp: Date.now(),
              });
            } catch (auditError) {
              // Log error but don't fail authentication if audit logging fails
              console.error('Failed to log successful authentication:', auditError);
            }
            
            return {
              id: result.user._id,
              email: result.user.email,
              name: result.user.name,
              role: normalizedRole, // Use normalized role (clinic_user for admin/provider)
              originalRole: originalRole, // Keep original for backward compatibility
              tenantId: result.user.tenantId,
              isOwner: result.user.isOwner ?? false,
              clinics: result.user.clinics ?? [],
              permissions: result.user.permissions,
              passwordExpiration: result.user.passwordExpiration, // Include expiration info for UI
            };
          } else {
            console.error("❌ Authentication failed - invalid credentials or user not found");
            console.error("❌ Result:", result);
            
            // HIPAA Compliance: Log failed authentication attempt
            try {
              await convexClient.mutation(convexApi.auditLogs.create, {
                tenantId: tenantId || 'default',
                userId: undefined, // No user ID for failed attempts
                action: 'login_failed',
                resource: 'authentication',
                resourceId: credentials.email, // Use email as resourceId for failed attempts
                details: {
                  email: credentials.email,
                  reason: 'invalid_credentials',
                  timestamp: Date.now(),
                  source: 'nextauth_authorize',
                },
                ipAddress: undefined, // IP will be captured by middleware/client
                userAgent: undefined, // User agent will be captured by middleware/client
                timestamp: Date.now(),
              });
            } catch (auditError) {
              // Log error but don't fail authentication flow if audit logging fails
              console.error('Failed to log failed authentication:', auditError);
            }
          }
        } catch (error: any) {
          // HIPAA Compliance: Log failed authentication attempt
          try {
            const { convex: convexClient, api: convexApi } = await initializeConvex();
            if (convexClient && convexApi) {
              await convexClient.mutation(convexApi.auditLogs.create, {
                tenantId: credentials.tenantId || 'default',
                userId: undefined, // No user ID for failed attempts
                action: 'login_failed',
                resource: 'authentication',
                resourceId: credentials.email, // Use email as resourceId for failed attempts
                details: {
                  email: credentials.email,
                  reason: error?.message || 'authentication_error',
                  errorType: error?.message === "MFA_REQUIRED" ? 'mfa_required' :
                            error?.message === "PASSWORD_EXPIRED" ? 'password_expired' :
                            error?.message?.startsWith("ACCOUNT_LOCKED") ? 'account_locked' :
                            'authentication_failed',
                  timestamp: Date.now(),
                  source: 'nextauth_authorize',
                },
                ipAddress: undefined, // IP will be captured by middleware/client
                userAgent: undefined, // User agent will be captured by middleware/client
                timestamp: Date.now(),
              });
            }
          } catch (auditError) {
            // Log error but don't fail authentication flow if audit logging fails
            console.error('Failed to log failed authentication:', auditError);
          }
          
          // Check if this is an MFA_REQUIRED error
          if (error?.message === "MFA_REQUIRED") {
            // Re-throw with a special error that NextAuth can handle
            // We'll handle this in the signin page
            throw error;
          }
          
          // Check if this is a PASSWORD_EXPIRED error
          if (error?.message === "PASSWORD_EXPIRED") {
            // Re-throw with a special error that NextAuth can handle
            // We'll handle this in the signin page
            throw error;
          }
          
          // Check if this is an ACCOUNT_LOCKED error
          if (error?.message?.startsWith("ACCOUNT_LOCKED:")) {
            // Re-throw with the lockout error message
            // We'll handle this in the signin page
            throw error;
          }
          
          console.error("❌ Convex authentication failed:", error?.message || error);
          console.error("❌ Error stack:", error?.stack);
          // Return null - no fallback to hardcoded users
          return null;
        }
        
        return null;
      }
    })
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allow redirects to paths on the same domain
      if (process.env.NODE_ENV === 'development') {
        console.log('🔀 NextAuth redirect callback - url:', url, 'baseUrl:', baseUrl);
      }
      
      // If url is relative, return it as-is
      if (url.startsWith("/")) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Relative URL, allowing:', url);
        }
        return `${baseUrl}${url}`;
      }
      
      // If url is absolute but on same origin, return it
      if (url.startsWith(baseUrl)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Same baseUrl, allowing:', url);
        }
        return url;
      }
      
      // Handle Vercel preview deployments - extract pathname from different preview URLs
      try {
        const urlObj = new URL(url);
        const baseUrlObj = new URL(baseUrl);
        
        // If both are Vercel preview deployments, extract pathname and use current baseUrl
        const isVercelPreview = urlObj.hostname.endsWith('.vercel.app') && baseUrlObj.hostname.endsWith('.vercel.app');
        const isSameDomain = urlObj.hostname === baseUrlObj.hostname;
        
        if (isVercelPreview || isSameDomain) {
          // Extract pathname and use current baseUrl (preview deployment URL)
          const redirectPath = urlObj.pathname + urlObj.search;
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Vercel preview/same domain, extracting pathname:', redirectPath);
          }
          return `${baseUrl}${redirectPath}`;
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Error parsing URL in redirect callback:', e);
        }
      }
      
      // For any other case, return baseUrl (home page)
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ Different origin, returning baseUrl');
      }
      return baseUrl;
    },
    async jwt({ token, user, trigger }) {
      // On initial login, user object is provided
      if (user) {
        // Store user ID in token.sub so it's available in session callback
        token.sub = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        // Include new access system fields
        token.isOwner = (user as any).isOwner;
        token.clinics = (user as any).clinics;
        token.permissions = (user as any).permissions;
        // Keep original role for backward compatibility
        token.originalRole = (user as any).originalRole;
        // Include password expiration status
        token.passwordExpired = (user as any).passwordExpired || false;
        token.passwordExpiration = (user as any).passwordExpiration;
        // Include session ID for session management
        token.sessionId = (user as any).sessionId;
        // Store name from user object
        token.name = (user as any).name;
      } else if (token.sub && trigger === 'update') {
        // When token is refreshed (via update() call), fetch fresh user data from database
        try {
          const { convex: convexClient, api: convexApi } = await initializeConvex();
          if (convexClient && convexApi) {
            const userData = await convexClient.query(convexApi.users.getUserById, {
              userId: token.sub as Id<'users'>,
            });
            
            if (userData) {
              // Update token with fresh user data
              token.name = userData.name || token.name;
              token.role = userData.role || token.role;
              token.tenantId = userData.tenantId || token.tenantId;
              token.isOwner = userData.isOwner ?? token.isOwner;
              token.clinics = userData.clinics ?? token.clinics;
              token.permissions = userData.permissions ?? token.permissions;
              // Note: passwordExpiration and other fields can be updated here if needed
            }
          }
        } catch (error) {
          // If fetching fresh data fails, keep existing token data
          // This prevents breaking the session if there's a temporary database issue
          console.warn('Failed to refresh user data in JWT callback:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Use token.sub (which contains the user.id from authorize) as the session user ID
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        // Update name from token (refreshed from database)
        session.user.name = (token.name as string) || session.user.name;
        // Include new access system fields
        session.user.isOwner = token.isOwner as boolean | undefined;
        session.user.clinics = token.clinics as string[] | undefined;
        session.user.permissions = token.permissions as any;
        // Include originalRole for backward compatibility routing
        (session.user as any).originalRole = token.originalRole as string | undefined;
        // Include password expiration status
        (session.user as any).passwordExpired = token.passwordExpired as boolean | undefined;
        (session.user as any).passwordExpiration = token.passwordExpiration as any;
      }
      return session;
    }
  },
  pages: {
    signIn: "/",
    error: "/auth/error"
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // 1 hour
    generateSessionToken: () => {
      // Generate cryptographically secure session token
      const crypto = require('crypto');
      return crypto.randomBytes(32).toString('hex');
    },
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  cookies: {
    sessionToken: {
      name: NEXTAUTH_SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // Always use secure cookies on Vercel (HTTPS) or in production
        secure: process.env.NODE_ENV === 'production' || 
                process.env.VERCEL_ENV === 'production' || 
                process.env.VERCEL === '1' ||
                (typeof process !== 'undefined' && process.env.VERCEL_URL?.includes('vercel.app')),
        maxAge: 24 * 60 * 60, // 24 hours
      },
    },
    callbackUrl: {
      name: NEXTAUTH_CALLBACK_URL_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production' || 
                process.env.VERCEL_ENV === 'production' || 
                process.env.VERCEL === '1' ||
                (typeof process !== 'undefined' && process.env.VERCEL_URL?.includes('vercel.app')),
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production' || 
                process.env.VERCEL_ENV === 'production' || 
                process.env.VERCEL === '1' ||
                (typeof process !== 'undefined' && process.env.VERCEL_URL?.includes('vercel.app')),
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development',
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata);
    },
    warn(code) {
      console.warn('NextAuth Warning:', code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log('NextAuth Debug:', code, metadata);
      }
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
        if (process.env.NODE_ENV === 'development') {
          console.log('User signed in:', { userId: user.id, email: user.email, isNewUser });
        }
    },
    async signOut({ token }) {
        if (process.env.NODE_ENV === 'development') {
          console.log('User signed out:', { userId: token?.sub });
        }
    },
    async createUser({ user }) {
        if (process.env.NODE_ENV === 'development') {
          console.log('New user created:', { userId: user.id, email: user.email });
        }
    },
  },
  // Always use secure cookies on Vercel (always HTTPS) or in production
  useSecureCookies: process.env.NODE_ENV === 'production' || 
                     process.env.VERCEL_ENV === 'production' || 
                     process.env.VERCEL === '1' ||
                     (typeof process !== 'undefined' && process.env.VERCEL_URL?.includes('vercel.app')),
  // Required for Vercel deployments - uses request host header
  // Using type assertion as trustHost is valid in NextAuth v4 but may not be in types
  ...({ trustHost: true } as any),
};
