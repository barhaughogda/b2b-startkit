'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Diagnosis {
  id: string;
  name: string;
  bodyRegion: string;
  position: { x: number; y: number };
  severity: 'mild' | 'moderate' | 'severe';
  anatomicalLayers?: string[];
}

export interface InteractiveBodyMapProps {
  patientId: string;
  onBodyPartClick?: (bodyPart: string) => void;
  onDiagnosisClick?: (diagnosis: Diagnosis) => void;
  selectedDiagnoses?: Diagnosis[];
  className?: string;
}


export function InteractiveBodyMap({
  patientId,
  onBodyPartClick,
  onDiagnosisClick,
  selectedDiagnoses = [],
  className
}: InteractiveBodyMapProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Handle iframe load
  const handleIframeLoad = useCallback(() => {
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      setLoadTimeout(null);
    }
    setIsLoading(false);
    setHasError(false);
  }, [loadTimeout]);

  // Handle iframe error
  const handleIframeError = useCallback(() => {
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      setLoadTimeout(null);
    }
    setIsLoading(false);
    setHasError(true);
  }, [loadTimeout]);

  // Handle client-side mounting to prevent hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Set up timeout for iframe loading
  useEffect(() => {
    if (!isMounted) return;

    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setHasError(true);
      }
    }, 10000); // 10 second timeout

    setLoadTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [isLoading, isMounted]);

  // Handle diagnosis click
  const handleDiagnosisClick = useCallback((diagnosis: Diagnosis) => {
    onDiagnosisClick?.(diagnosis);
  }, [onDiagnosisClick]);

  // Generate iframe source URL
  const getIframeSrc = useCallback(() => {
    const baseUrl = 'https://human.biodigital.com/viewer/?id=6VsM';
    const params = new URLSearchParams({
      'ui-anatomy-descriptions': 'true',
      'ui-anatomy-pronunciations': 'true',
      'ui-anatomy-labels': 'true',
      'ui-audio': 'true',
      'ui-chapter-list': 'false',
      'ui-fullscreen': 'true',
      'ui-help': 'true',
      'ui-info': 'true',
      'ui-label-list': 'true',
      'ui-layers': 'true',
      'ui-skin-layers': 'true',
      'ui-loader': 'circle',
      'ui-media-controls': 'full',
      'ui-menu': 'true',
      'ui-nav': 'true',
      'ui-search': 'true',
      'ui-tools': 'true',
      'ui-tutorial': 'false',
      'ui-undo': 'true',
      'ui-whiteboard': 'true',
      'initial.none': 'true',
      'disable-scroll': 'false',
      'uaid': 'MGrYB',
      'paid': 'o_1447af23'
    });

    return `${baseUrl}&${params.toString()}`;
  }, []);

  // Use all selected diagnoses since we removed layer filtering
  const filteredDiagnoses = selectedDiagnoses;

  return (
    <div 
      className={cn("space-y-6", className)}
      data-testid="interactive-bodymap-container"
      role="application"
      aria-label="Interactive Human Anatomy Map"
      aria-describedby="body-map-description"
    >
      <div id="body-map-description" className="sr-only">
        Interactive human anatomy map with 3D visualization.
        Use the embedded BioDigital Human viewer to explore anatomical systems.
      </div>

      {/* Main Body Map - Full Space */}
      <Card>
        <CardContent className="p-0">
          <div className="relative w-full h-[600px] bg-gray-50 overflow-hidden">
            {!isMounted ? (
              <div 
                className="absolute inset-0 flex items-center justify-center bg-gray-100"
                data-testid="bodymap-loading"
              >
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading interactive anatomy viewer...</p>
                </div>
              </div>
            ) : isLoading && (
              <div 
                className="absolute inset-0 flex items-center justify-center bg-gray-100"
                data-testid="bodymap-loading"
              >
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading interactive anatomy viewer...</p>
                </div>
              </div>
            )}

            {isMounted && hasError && (
              <div 
                className="absolute inset-0 flex items-center justify-center bg-gray-100"
                data-testid="bodymap-error"
              >
                <div className="text-center max-w-md mx-auto p-6">
                  <div className="mb-4">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Interactive Anatomy Viewer Blocked</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Your browser is blocking the interactive anatomy viewer for security reasons. This is common with iframe content from external sources.
                    </p>
                    <div className="text-left text-xs text-gray-500 space-y-2">
                      <p><strong>To fix this issue:</strong></p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        <li>Disable ad blockers or content blockers for this site</li>
                        <li>Check your browser&apos;s security settings</li>
                        <li>Try refreshing the page</li>
                        <li>Contact your IT administrator if on a corporate network</li>
                      </ul>
                    </div>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Refresh Page
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isMounted && (
              <iframe
                id="embedded-human"
                data-testid="biodigital-human-iframe"
                frameBorder="0"
                style={{ aspectRatio: '4 / 3', width: '100%' }}
                allowFullScreen={true}
                loading="lazy"
                src={getIframeSrc()}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                allow="fullscreen; camera; microphone; geolocation; autoplay; clipboard-write; web-share"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
                referrerPolicy="no-referrer-when-downgrade"
                className={cn(
                  "w-full h-full",
                  isLoading && "opacity-0",
                  hasError && "opacity-0"
                )}
              />
            )}

            {/* Diagnosis Markers Overlay */}
            {isMounted && !isLoading && !hasError && (
              <div className="absolute inset-0 pointer-events-none">
                {filteredDiagnoses.map((diagnosis) => (
                  <div
                    key={diagnosis.id}
                    data-testid={`diagnosis-marker-${diagnosis.id}`}
                    className="absolute w-6 h-6 rounded-full border-2 border-white cursor-pointer pointer-events-auto transition-all duration-200 hover:scale-110"
                    style={{
                      left: `${diagnosis.position.x}%`,
                      top: `${diagnosis.position.y}%`,
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: diagnosis.severity === 'severe' ? '#ef4444' : 
                                     diagnosis.severity === 'moderate' ? '#f59e0b' : '#10b981'
                    }}
                    onClick={() => handleDiagnosisClick(diagnosis)}
                    title={`${diagnosis.name} - ${diagnosis.severity} severity`}
                  >
                    <div className="w-full h-full rounded-full bg-white/20 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
