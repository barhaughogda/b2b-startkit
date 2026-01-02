/**
 * Type declarations for Google Maps JavaScript API
 * These types are used for the Places Autocomplete functionality
 */

export interface GooglePlaceAddressComponent {
  types: string[];
  long_name: string;
  short_name: string;
}

export interface GooglePlaceGeometry {
  location: {
    lat: () => number;
    lng: () => number;
  };
}

export interface GooglePlaceResult {
  place_id?: string;
  formatted_address?: string;
  name?: string;
  address_components?: GooglePlaceAddressComponent[];
  geometry?: GooglePlaceGeometry;
}

export interface GoogleMapsAutocompleteOptions {
  types?: string[];
  fields?: string[];
}

export interface GoogleMapsAutocompleteInstance {
  getPlace: () => GooglePlaceResult;
  addListener: (event: string, callback: () => void) => google.maps.MapsEventListener;
}

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: GoogleMapsAutocompleteOptions
          ) => GoogleMapsAutocompleteInstance;
        };
        event: {
          clearInstanceListeners: (instance: any) => void;
          removeListener: (listener: google.maps.MapsEventListener) => void;
        };
      };
    };
    gm_authFailure?: () => void;
  }
}

export {};

