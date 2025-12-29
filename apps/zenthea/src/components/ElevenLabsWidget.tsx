'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useState, useRef } from 'react';
import { isClinicUser } from '@/lib/auth-utils';
import { isPublicTenantRoute } from '@/lib/tenant-routing';
import { isPublicAuthRoute } from '@/lib/routing';

/**
 * Conditionally renders the ElevenLabs AI Agent widget.
 * Shows when user is authenticated and has clinic user role (clinic_user, admin, provider).
 * Hidden on public tenant routes (e.g., /clinic/[slug] landing pages).
 * Hidden on website builder routes (/company/settings/website and /company/settings/website/builder)
 * to avoid interfering with the website preview.
 * Hidden when rendered inside an iframe (e.g., website builder live preview).
 * Hidden on public login/auth pages (/, /auth/*, /patient/login, etc.).
 * Available for all roles within the clinic (clinic_user, admin, provider).
 */
export function ElevenLabsWidget() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [shouldRender, setShouldRender] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const scriptLoadRef = useRef(false);

  useEffect(() => {
    // Only render if:
    // 1. Session is loaded (not loading)
    // 2. User is authenticated
    // 3. User has clinic user role (clinic_user, admin, or provider)
    // 4. User is NOT on a public tenant route (e.g., /clinic/[slug] landing pages)
    // 5. User is NOT on the website builder page (to avoid interfering with preview)
    // 6. User is NOT in an iframe (website builder preview)
    // 7. User is NOT on public login/auth pages (/, /auth/*, /patient/login, etc.)
    const isAuthenticated = status === 'authenticated' && session?.user;
    const isClinicUserRole = isClinicUser(session?.user);
    const isPublicRoute = pathname ? isPublicTenantRoute(pathname) : false;
    // Hide on /company/settings/website and all sub-routes (e.g., /company/settings/website/builder)
    const isWebsiteBuilderRoute = pathname?.startsWith('/company/settings/website') ?? false;
    // Hide when rendered inside an iframe (e.g., website builder preview)
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    // Hide on public login/auth pages
    const isPublicAuth = isPublicAuthRoute(pathname);
    
    setShouldRender(isAuthenticated && isClinicUserRole && !isPublicRoute && !isWebsiteBuilderRoute && !isInIframe && !isPublicAuth);
  }, [session, status, pathname]);

  // Check if custom element is already defined (script was loaded previously)
  useEffect(() => {
    if (shouldRender && typeof window !== 'undefined') {
      // Check if the custom element is already defined
      if (customElements.get('elevenlabs-convai')) {
        setScriptLoaded(true);
        scriptLoadRef.current = true;
      } else {
        // Custom element not defined, reset to allow script reload
        setScriptLoaded(false);
        scriptLoadRef.current = false;
      }
    } else {
      // Reset script loaded state when shouldRender becomes false
      // This prevents stale state if user navigates away and back
      setScriptLoaded(false);
      scriptLoadRef.current = false;
    }
  }, [shouldRender]);

  // Don't render anything if conditions aren't met
  if (!shouldRender) {
    return null;
  }

  const handleScriptLoad = () => {
    // Verify the custom element is actually defined before marking as loaded
    if (typeof window !== 'undefined' && customElements.get('elevenlabs-convai')) {
      setScriptLoaded(true);
      scriptLoadRef.current = true;
    }
  };

  // Check if script needs to be loaded
  const needsScriptLoad = !scriptLoadRef.current && typeof window !== 'undefined' && !customElements.get('elevenlabs-convai');

  return (
    <>
      {/* ElevenLabs AI Agent Script */}
      {/* Only load script if it hasn't been loaded yet */}
      {needsScriptLoad && (
        <Script 
          src="https://unpkg.com/@elevenlabs/convai-widget-embed" 
          strategy="afterInteractive"
          onLoad={handleScriptLoad}
          onError={() => {
            console.error('Failed to load ElevenLabs widget script');
            // Don't set scriptLoaded to true on error
          }}
        />
      )}
      {/* ElevenLabs AI Agent Widget - Only render after script is loaded */}
      {/* Double-check that custom element is defined before rendering */}
      {scriptLoaded && typeof window !== 'undefined' && customElements.get('elevenlabs-convai') && (
        <elevenlabs-convai agent-id="agent_6701k71ydkvpezzbn04m50mn57f1"></elevenlabs-convai>
      )}
    </>
  );
}

