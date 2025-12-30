import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantId: { label: "Tenant ID", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Mock authentication for testing - accepts demo credentials
        const validCredentials = [
          { email: "admin@zenthea.com", password: "admin123", role: "admin", name: "Admin User" },
          { email: "provider@zenthea.com", password: "provider123", role: "provider", name: "Provider User" },
          { email: "demo@zenthea.com", password: "demo123", role: "patient", name: "Demo User" },
          { email: "patient@zenthea.com", password: "patient123", role: "patient", name: "Patient User" },
        ];

        const user = validCredentials.find(
          cred => cred.email === credentials.email && cred.password === credentials.password
        );

        if (user) {
          // Map admin/provider roles to clinic_user for new access system
          // Keep original role for backward compatibility during migration
          const originalRole = user.role;
          const normalizedRole = (originalRole === 'admin' || originalRole === 'provider') 
            ? 'clinic_user' 
            : originalRole;
          
          return {
            id: user.email.split('@')[0]!, // Use email prefix as ID
            email: user.email,
            name: user.name,
            role: normalizedRole, // Use normalized role (clinic_user for admin/provider)
            originalRole: originalRole, // Keep original for backward compatibility
            tenantId: credentials.tenantId || "demo-tenant",
            isOwner: originalRole === 'admin', // Mock: admins are owners
            departments: [], // Mock: empty departments array
            permissions: undefined, // Mock: no permissions for now
            image: null,
          } as any;
        }
        
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.tenantId = user.tenantId;
        // Include new access system fields
        token.isOwner = (user as any).isOwner;
        token.clinics = (user as any).clinics;
        token.permissions = (user as any).permissions;
        token.originalRole = (user as any).originalRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
        // Include new access system fields
        session.user.isOwner = token.isOwner as boolean | undefined;
        session.user.clinics = token.clinics as string[] | undefined;
        session.user.permissions = token.permissions as any;
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 60 * 60, // 1 hour
  },
  secret: process.env.NEXTAUTH_SECRET || "development-secret",
  debug: process.env.NODE_ENV === 'development',
};
