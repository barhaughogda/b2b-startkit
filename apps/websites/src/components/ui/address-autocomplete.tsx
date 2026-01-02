"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { logger } from "@/lib/logger";
import type { GooglePlaceResult } from "@/types/google-maps";

interface AddressAutocompleteProps {
  id?: string;
  value: string;
  onChange: (address: string) => void;
  onPlaceSelect?: (place: GooglePlaceResult) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  className?: string;
}

// Google Maps types are loaded dynamically from the script
import type { GoogleMapsAutocompleteInstance } from "@/types/google-maps";
type GoogleMapsAutocomplete = GoogleMapsAutocompleteInstance;

// Global script loading state
let scriptLoadingPromise: Promise<void> | null = null;
let isScriptLoaded = false;

function loadGoogleMapsScript(): Promise<void> {
  // If already loaded, return resolved promise
  if (isScriptLoaded && window.google?.maps?.places) {
    return Promise.resolve();
  }

  // If already loading, return the existing promise
  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  // Check if script is already in the DOM
  const existingScript = document.querySelector(
    'script[src*="maps.googleapis.com"]'
  );

  if (existingScript) {
    // Script exists, wait for it to load
    scriptLoadingPromise = new Promise((resolve, reject) => {
      if (window.google?.maps?.places) {
        isScriptLoaded = true;
        resolve();
        return;
      }

      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          isScriptLoaded = true;
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("Google Maps script loading timeout"));
      }, 10000);

      existingScript.addEventListener("load", () => {
        clearInterval(checkInterval);
        isScriptLoaded = true;
        resolve();
      });

      existingScript.addEventListener("error", () => {
        clearInterval(checkInterval);
        reject(new Error("Failed to load Google Maps script"));
      });
    });

    return scriptLoadingPromise;
  }

  // Load the script
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  
  if (!apiKey) {
    console.warn(
      "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set. Google Maps autocomplete will not work."
    );
    return Promise.reject(new Error("Google Maps API key not configured"));
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    
    // Set up Google Maps API error handlers BEFORE loading the script
    let errorDetected = false;
    
    // Listen for Google Maps API authentication failures
    (window as any).gm_authFailure = () => {
      errorDetected = true;
      scriptLoadingPromise = null;
      reject(new Error("Google Maps API authentication failed. Please check your API key."));
    };
    
    // Listen for console errors from Google Maps
    const originalConsoleError = console.error;
    const errorListener = (message: string) => {
      if (typeof message === 'string') {
        if (message.includes('RefererNotAllowed') || message.includes('RefererNotAllowedMapError')) {
          errorDetected = true;
          scriptLoadingPromise = null;
          reject(new Error("Google Maps API key referer restriction: Please add 'http://localhost:3000/*' to your API key's allowed referrers in Google Cloud Console."));
        } else if (
          message.includes('InvalidKey') || 
          message.includes('API key') ||
          message.includes('authentication')
        ) {
          errorDetected = true;
          scriptLoadingPromise = null;
          reject(new Error("Invalid Google Maps API key. Please check your NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable."));
        }
      }
    };
    
    // Set up error handler
    const handleError = () => {
      if (!errorDetected) {
        errorDetected = true;
        scriptLoadingPromise = null;
        reject(new Error("Failed to load Google Maps script"));
      }
    };
    
    script.onload = () => {
      // Wait a bit for Google Maps to initialize and report any errors
      setTimeout(() => {
        if (errorDetected) {
          console.error = originalConsoleError; // Restore original
          return; // Error already handled
        }
        
        // Check if Google Maps loaded successfully
        const google = window.google;
        if (google?.maps?.places?.Autocomplete) {
          isScriptLoaded = true;
          console.error = originalConsoleError; // Restore original
          resolve();
        } else {
          // Script loaded but API is not available (likely API key error)
          // Check for specific error indicators
          const hasGoogleMaps = !!google?.maps;
          const hasPlaces = !!google?.maps?.places;
          
          errorDetected = true;
          scriptLoadingPromise = null;
          console.error = originalConsoleError; // Restore original
          
          if (!hasGoogleMaps) {
            reject(new Error("Google Maps API failed to load. Please check your API key."));
          } else if (!hasPlaces) {
            reject(new Error("Google Maps Places API is not available. Please ensure Places API is enabled in Google Cloud Console and your API key is valid."));
          } else {
            reject(new Error("Google Maps Places Autocomplete is not available. Please verify your API key has Places API enabled."));
          }
        }
      }, 1000); // Increased timeout to give Google Maps more time to report errors
    };
    
    script.onerror = handleError;
    
    // Temporarily override console.error to catch Google Maps errors
    console.error = (...args: any[]) => {
      originalConsoleError(...args);
      const message = args.join(' ');
      errorListener(message);
    };
    
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

export function AddressAutocomplete({
  id = "address-autocomplete",
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Start typing an address...",
  disabled = false,
  label,
  required = false,
  className,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<GoogleMapsAutocompleteInstance | null>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const isClickingDropdownRef = useRef(false);
  const isSettingPlaceRef = useRef(false); // Flag to prevent onChange from overriding place selection
  const isUserTypingRef = useRef(false); // Flag to track if user is actively typing
  const [isLoading, setIsLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(value); // Internal state for uncontrolled input

  // Keep refs up to date
  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onChange, onPlaceSelect]);

  // Sync value prop with input element only when changed externally (not from user typing)
  useEffect(() => {
    if (inputRef.current && !isUserTypingRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
      setInputValue(value);
    }
  }, [value]);

  // Load Google Maps script
  useEffect(() => {
    setIsLoading(true);
    setApiError(null);
    
    loadGoogleMapsScript()
      .then(() => {
        // Wait a bit for Google Maps to fully initialize and report any errors
        setTimeout(() => {
          const google = window.google;
          
          // Check if Google Maps loaded successfully
          if (!google?.maps) {
            setApiError("Google Maps API failed to initialize. Please check your API key.");
            setIsLoading(false);
            return;
          }
          
          // Check if Places API is available
          if (!google.maps.places) {
            setApiError("Google Maps Places API is not available. Please ensure Places API is enabled in Google Cloud Console.");
            setIsLoading(false);
            return;
          }
          
          // Check if Autocomplete is available
          if (!google.maps.places.Autocomplete) {
            setApiError("Google Maps Places Autocomplete is not available. Please verify your API key has Places API enabled.");
            setIsLoading(false);
            return;
          }
          
          // Success - set ready state
          setScriptReady(true);
          setIsLoading(false);
        }, 1000);
      })
      .catch((error) => {
        console.error("Error loading Google Maps:", error);
        setIsLoading(false);
        const errorMessage = error.message || "Failed to load Google Maps";
        
        if (errorMessage.includes("RefererNotAllowed") || errorMessage.includes("referer restriction")) {
          const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
          setApiError(`API key referer restriction: Add '${currentUrl}/*' to allowed referrers in Google Cloud Console → APIs & Services → Credentials → Your API Key → Application restrictions → HTTP referrers.`);
        } else if (errorMessage.includes("authentication") || 
            errorMessage.includes("API key") || 
            errorMessage.includes("InvalidKey") ||
            errorMessage.includes("Invalid Google Maps")) {
          setApiError("Invalid Google Maps API key. Please check your NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable and ensure it's valid.");
        } else if (errorMessage.includes("Places API")) {
          setApiError("Google Maps Places API is not enabled. Please enable it in Google Cloud Console.");
        } else {
          setApiError(errorMessage);
        }
      });
  }, []);

  // Initialize autocomplete when script is loaded
  useEffect(() => {
    if (!scriptReady || !inputRef.current || disabled) {
      return;
    }

    const google = window.google;
    
    // Check if Google Maps is available
    if (!google?.maps) {
      setApiError("Google Maps API is not available. Please check your API key configuration.");
      return;
    }
    
    // Check for API key errors by attempting to access places
    if (!google.maps.places) {
      setApiError("Google Maps Places API is not available. Please check your API key and ensure Places API is enabled in Google Cloud Console.");
      return;
    }
    
    // Try to detect invalid key errors by checking if Autocomplete constructor exists
    if (!google.maps.places.Autocomplete) {
      setApiError("Google Maps Places Autocomplete is not available. Please verify your API key has Places API enabled.");
      return;
    }
    
    // Clear any previous errors
    setApiError(null);

    // Clean up existing autocomplete if it exists
    if (autocompleteRef.current && google?.maps?.event) {
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
      autocompleteRef.current = null;
    }

    // Initialize autocomplete
    const autocomplete = new google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["address"],
        fields: ["formatted_address", "name", "geometry", "address_components", "place_id"],
      }
    );

    autocompleteRef.current = autocomplete;

    // Ensure the autocomplete dropdown is clickable by setting z-index and preventing event issues
    // Google Maps creates a pac-container element that needs proper z-index
    // Check if style already exists to avoid duplicates
    let styleElement = document.querySelector('style[data-address-autocomplete]');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.setAttribute('data-address-autocomplete', 'true');
      styleElement.textContent = `
        .pac-container {
          z-index: 9999 !important;
          pointer-events: auto !important;
        }
        .pac-item {
          cursor: pointer !important;
          pointer-events: auto !important;
        }
      `;
      document.head.appendChild(styleElement);
    }

    // Monitor for pac-container creation and ensure clicks work
    // Google Maps creates the pac-container dynamically, so we need to wait for it
    let checkPacContainerInterval: NodeJS.Timeout | null = null;
    
        const setupPacContainer = () => {
      const pacContainer = document.querySelector('.pac-container') as HTMLElement;
      if (pacContainer) {
        // Ensure pointer events are enabled and high z-index
        pacContainer.style.pointerEvents = 'auto';
        pacContainer.style.zIndex = '9999';
        
        // Mark that we're clicking on dropdown
        // IMPORTANT: Don't interfere with Google Maps click handling at all
        // We'll handle preventing modal close in onInteractOutside instead
        const handleMouseDown = (e: MouseEvent) => {
          isClickingDropdownRef.current = true;
          // Don't stop propagation here - let Google Maps handle it normally
        };
        
        const handleClick = (e: MouseEvent) => {
          isClickingDropdownRef.current = true;
          // Don't stop propagation here - let Google Maps handle it normally
          // Reset flag after a short delay
          setTimeout(() => {
            isClickingDropdownRef.current = false;
          }, 300);
        };
        
        // Remove existing listeners to avoid duplicates
        pacContainer.removeEventListener('mousedown', handleMouseDown, false);
        pacContainer.removeEventListener('click', handleClick, false);
        
        // Add listeners in bubble phase (after Google Maps handles it)
        // We're just tracking that we're clicking, not preventing anything
        pacContainer.addEventListener('mousedown', handleMouseDown, false);
        pacContainer.addEventListener('click', handleClick, false);
        
        // Also handle all pac-items individually - just for tracking
        const pacItems = pacContainer.querySelectorAll('.pac-item');
        pacItems.forEach((item) => {
          const itemElement = item as HTMLElement;
          itemElement.style.pointerEvents = 'auto';
          itemElement.style.cursor = 'pointer';
          
          // Just track, don't interfere
          const handleItemMouseDown = (e: MouseEvent) => {
            isClickingDropdownRef.current = true;
          };
          
          const handleItemClick = (e: MouseEvent) => {
            isClickingDropdownRef.current = true;
            setTimeout(() => {
              isClickingDropdownRef.current = false;
            }, 300);
          };
          
          itemElement.removeEventListener('mousedown', handleItemMouseDown, false);
          itemElement.removeEventListener('click', handleItemClick, false);
          itemElement.addEventListener('mousedown', handleItemMouseDown, false);
          itemElement.addEventListener('click', handleItemClick, false);
        });
        
        // Clear the interval once we've set it up
        if (checkPacContainerInterval) {
          clearInterval(checkPacContainerInterval);
          checkPacContainerInterval = null;
        }
      }
    };
    
    checkPacContainerInterval = setInterval(setupPacContainer, 100);

    // Clean up interval after 5 seconds
    setTimeout(() => {
      if (checkPacContainerInterval) {
        clearInterval(checkPacContainerInterval);
        checkPacContainerInterval = null;
      }
    }, 5000);

    // Handle place selection
    const listener = autocomplete.addListener("place_changed", () => {
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Google Maps place_changed event fired');
      }
      
      // Set flags IMMEDIATELY to prevent input onChange from interfering
      isSettingPlaceRef.current = true;
      isUserTypingRef.current = false;
      isClickingDropdownRef.current = true; // Also set dropdown flag to prevent onChange
      
      // Use setTimeout to ensure the place is fully loaded
      setTimeout(() => {
        const place = autocomplete.getPlace();
        if (process.env.NODE_ENV === 'development') {
          logger.debug('Place object:', place);
        }
        
        // Check if place is valid
        if (!place || place.place_id === undefined) {
          console.warn('Google Maps place_changed event fired but place is invalid:', place);
          isSettingPlaceRef.current = false;
          return;
        }
        
        // Get the formatted address - use formatted_address if available, otherwise construct from name
        let addressToSet = '';
        
        if (place?.formatted_address) {
          addressToSet = place.formatted_address;
        } else if (place?.name) {
          // Fallback to name if formatted_address is not available
          addressToSet = place.name;
        } else if (place?.address_components && place.address_components.length > 0) {
          // Construct address from components as last resort
          const components = place.address_components;
          const streetNumber = components.find((c: { types: string[] }) => c.types.includes('street_number'))?.long_name || '';
          const streetName = components.find((c: { types: string[] }) => c.types.includes('route'))?.long_name || '';
          const city = components.find((c: { types: string[] }) => c.types.includes('locality'))?.long_name || '';
          const state = components.find((c: { types: string[] }) => c.types.includes('administrative_area_level_1'))?.short_name || '';
          const zip = components.find((c: { types: string[] }) => c.types.includes('postal_code'))?.long_name || '';
          
          const parts = [streetNumber, streetName, city, state, zip].filter(Boolean);
          addressToSet = parts.join(', ');
        }
        
        if (addressToSet) {
          // Update the input element directly (uncontrolled input)
          if (inputRef.current) {
            inputRef.current.value = addressToSet;
            setInputValue(addressToSet);
          }
          
          // Update the form state via onChange - call this immediately to ensure it's set
          onChangeRef.current(addressToSet);
          
          // Call onPlaceSelect callback if provided - this should also update the form
          if (onPlaceSelectRef.current) {
            onPlaceSelectRef.current(place);
          }
          
          // Reset flags after a delay to allow React to update and prevent race conditions
          setTimeout(() => {
            isSettingPlaceRef.current = false;
            isClickingDropdownRef.current = false;
          }, 500);
        } else {
          console.warn('Google Maps place_changed fired but no address could be extracted from place:', place);
          console.warn('Place object:', place);
          isSettingPlaceRef.current = false;
          isClickingDropdownRef.current = false;
        }
      }, 150); // Small delay to ensure place is fully loaded
    });

    return () => {
      if (autocompleteRef.current && google?.maps?.event) {
        google.maps.event.removeListener(listener);
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
      // Clean up style element
      const styleElement = document.querySelector('style[data-address-autocomplete]');
      if (styleElement) {
        styleElement.remove();
      }
      // Clean up interval if still running (handled by closure)
    };
  }, [scriptReady, disabled]);

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-status-error ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          defaultValue={value}
          onChange={(e) => {
            // Don't update if we're currently setting a place from Google Maps
            if (isSettingPlaceRef.current) {
              if (process.env.NODE_ENV === 'development') {
                logger.debug('Ignoring onChange because place is being set');
              }
              return;
            }
            // Don't update if user is clicking on dropdown (place selection in progress)
            if (isClickingDropdownRef.current) {
              if (process.env.NODE_ENV === 'development') {
                logger.debug('Ignoring onChange because dropdown click detected');
              }
              return;
            }
            // Track that user is typing
            isUserTypingRef.current = true;
            const newValue = e.target.value;
            if (process.env.NODE_ENV === 'development') {
              logger.debug('Input onChange fired with value:', newValue);
            }
            setInputValue(newValue);
            // Update parent component
            onChangeRef.current(newValue);
            // Reset typing flag after a short delay
            setTimeout(() => {
              isUserTypingRef.current = false;
            }, 100);
          }}
          onMouseDown={(e) => {
            // Check if clicking on pac-container - if so, don't let input handle it
            const target = e.target as HTMLElement;
            const pacContainer = document.querySelector('.pac-container');
            if (pacContainer && pacContainer.contains(target)) {
              // Click is on dropdown - let it propagate
              return;
            }
          }}
          onBlur={(e) => {
            // Delay blur handling to allow Google Maps place_changed event to fire first
            const blurTimeout = setTimeout(() => {
              // If we're clicking on the dropdown, prevent blur from closing modal
              if (isClickingDropdownRef.current) {
                // Keep focus on input to allow place selection to complete
                if (inputRef.current && document.contains(inputRef.current)) {
                  inputRef.current.focus();
                }
                return;
              }
              
              // Check if the blur is caused by clicking on pac-container
              const relatedTarget = e.relatedTarget as HTMLElement;
              const pacContainer = document.querySelector('.pac-container');
              
              // If clicking on dropdown, prevent blur from closing modal
              if (pacContainer && pacContainer.contains(relatedTarget)) {
                // Keep focus on input to prevent modal close
                if (inputRef.current && document.contains(inputRef.current)) {
                  inputRef.current.focus();
                }
                return;
              }
              
              // Check if focus moved to pac-container
              const activeElement = document.activeElement;
              const pacContainerCheck = document.querySelector('.pac-container');
              
              if (pacContainerCheck && pacContainerCheck.contains(activeElement)) {
                // Focus moved to dropdown - keep input focused
                if (inputRef.current && document.contains(inputRef.current)) {
                  inputRef.current.focus();
                }
              }
            }, 200); // Increased delay to allow place_changed to fire
            
            // Store timeout to clear if needed
            (e.target as any)._blurTimeout = blurTimeout;
          }}
          onFocus={(e) => {
            // Clear any pending blur timeout
            const target = e.target as any;
            if (target._blurTimeout) {
              clearTimeout(target._blurTimeout);
              target._blurTimeout = null;
            }
          }}
          onKeyDown={(e) => {
            // Handle Enter key to select from dropdown
            if (e.key === 'Enter') {
              // Give Google Maps a moment to process the selection, then check for place
              setTimeout(() => {
                if (autocompleteRef.current) {
                    try {
                      const place = autocompleteRef.current.getPlace();
                      if (process.env.NODE_ENV === 'development') {
                        logger.debug('Enter pressed, place:', place);
                      }
                    if (place && place.place_id) {
                      // Place was selected - extract address and update
                      let addressToSet = '';
                      
                      if (place?.formatted_address) {
                        addressToSet = place.formatted_address;
                      } else if (place?.name) {
                        addressToSet = place.name;
                      } else if (place?.address_components && place.address_components.length > 0) {
                        const components = place.address_components;
                        const streetNumber = components.find((c: { types: string[] }) => c.types.includes('street_number'))?.long_name || '';
                        const streetName = components.find((c: { types: string[] }) => c.types.includes('route'))?.long_name || '';
                        const city = components.find((c: { types: string[] }) => c.types.includes('locality'))?.long_name || '';
                        const state = components.find((c: { types: string[] }) => c.types.includes('administrative_area_level_1'))?.short_name || '';
                        const zip = components.find((c: { types: string[] }) => c.types.includes('postal_code'))?.long_name || '';
                        
                        const parts = [streetNumber, streetName, city, state, zip].filter(Boolean);
                        addressToSet = parts.join(', ');
                      }
                      
                      if (addressToSet) {
                        if (process.env.NODE_ENV === 'development') {
                          logger.debug('Setting address from Enter key:', addressToSet);
                        }
                        isSettingPlaceRef.current = true;
                        onChangeRef.current(addressToSet);
                        setTimeout(() => {
                          isSettingPlaceRef.current = false;
                        }, 100);
                      }
                    }
                  } catch (error) {
                    console.warn('Error getting place on Enter:', error);
                  }
                }
              }, 200); // Longer delay to ensure Google Maps has processed the selection
            }
          }}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          required={required}
          className="w-full"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
          </div>
        )}
      </div>
      {apiError && (
        <p className="text-xs text-status-error mt-1">
          {apiError}
        </p>
      )}
      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && !apiError && (
        <p className="text-xs text-status-warning mt-1">
          Google Maps API key not configured. Address autocomplete will not work.
        </p>
      )}
      {!apiError && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <p className="text-xs text-text-tertiary mt-1">
          Start typing an address to see suggestions from Google Maps.
        </p>
      )}
    </div>
  );
}

