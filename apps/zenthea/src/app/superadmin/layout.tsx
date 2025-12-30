import { getZentheaServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { logAdminAction } from "@/lib/security/audit-logger";

/**
 * Helper function to create a NextRequest for audit logging
 * Extracts request information from headers and session
 */
function createAuditRequest(
  pathname: string,
  userAgent: string,
  ipAddress: string,
  session: { user?: { id?: string; email?: string; role?: string } } | null
): NextRequest {
  return new NextRequest('http://localhost' + pathname, {
    headers: new Headers({
      'user-agent': userAgent,
      'x-forwarded-for': ipAddress,
      'x-user-id': session?.user?.id || '',
      'x-user-email': session?.user?.email || '',
      'x-user-role': session?.user?.role || '',
    }),
  });
}

/**
 * Helper function to log audit events non-blocking
 */
function logAuditNonBlocking(
  request: NextRequest,
  action: string,
  details: Record<string, any>,
  success: boolean,
  errorMessage?: string
): void {
  logAdminAction(request, action, 'superadmin_route', details, success, errorMessage).catch(
    (error) => {
      // Log error but don't block request processing
      if (process.env.NODE_ENV === 'development') {
        console.error('Audit logging failed:', error);
      }
    }
  );
}

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getZentheaServerSession();
  const headersList = await headers();
  
  // Get request information for audit logging
  const xPathname = headersList.get('x-pathname');
  const referer = headersList.get('referer') || '';
  let pathname = '/superadmin';
  
  if (xPathname) {
    pathname = xPathname.startsWith('http') ? new URL(xPathname).pathname : xPathname;
  } else if (referer) {
    try {
      pathname = new URL(referer).pathname;
    } catch {
      pathname = referer.startsWith('/') ? referer : '/superadmin';
    }
  }
  const userAgent = headersList.get('user-agent') || 'unknown';
  const ipAddress = headersList.get('x-forwarded-for') || 
                    headersList.get('x-real-ip') || 
                    headersList.get('cf-connecting-ip') || 
                    'unknown';

  // Check if user is authenticated and has superadmin role
  if (!session?.user || session.user.role !== 'super_admin') {
    // Log unauthorized access attempt
    const auditRequest = createAuditRequest(pathname, userAgent, ipAddress, session);
    logAuditNonBlocking(
      auditRequest,
      'unauthorized_access',
      {
        attemptedPath: pathname,
        userRole: session?.user?.role,
        userId: session?.user?.id,
        success: false,
      },
      false,
      'Superadmin access required'
    );
    
    redirect('/auth/signin?error=AccessDenied&message=Superadmin+access+required');
  }

  // Log authorized access
  const auditRequest = createAuditRequest(pathname, userAgent, ipAddress, session);
  logAuditNonBlocking(
    auditRequest,
    'authorized_access',
    {
      attemptedPath: pathname,
      userRole: session.user.role,
      userId: session.user.id,
      success: true,
    },
    true
  );

  return <>{children}</>;
}

