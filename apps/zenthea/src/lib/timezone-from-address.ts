/**
 * Utility functions for detecting timezone from address
 * 
 * Maps US states to their primary IANA timezone.
 * Note: Some states have multiple timezones (e.g., Florida, Texas, Oregon).
 * This provides the most common timezone for each state.
 */

// US State to IANA timezone mapping
// Uses the most common timezone for states that span multiple zones
const US_STATE_TIMEZONES: Record<string, string> = {
  // Eastern Time (ET)
  'CT': 'America/New_York',
  'DE': 'America/New_York',
  'DC': 'America/New_York',
  'FL': 'America/New_York', // Most of Florida is Eastern
  'GA': 'America/New_York',
  'IN': 'America/Indiana/Indianapolis', // Most of Indiana is Eastern
  'KY': 'America/New_York', // Most of Kentucky is Eastern
  'ME': 'America/New_York',
  'MD': 'America/New_York',
  'MA': 'America/New_York',
  'MI': 'America/Detroit', // Most of Michigan is Eastern
  'NH': 'America/New_York',
  'NJ': 'America/New_York',
  'NY': 'America/New_York',
  'NC': 'America/New_York',
  'OH': 'America/New_York',
  'PA': 'America/New_York',
  'RI': 'America/New_York',
  'SC': 'America/New_York',
  'TN': 'America/New_York', // Most of Tennessee is Eastern
  'VT': 'America/New_York',
  'VA': 'America/New_York',
  'WV': 'America/New_York',
  
  // Central Time (CT)
  'AL': 'America/Chicago',
  'AR': 'America/Chicago',
  'IL': 'America/Chicago',
  'IA': 'America/Chicago',
  'KS': 'America/Chicago', // Most of Kansas is Central
  'LA': 'America/Chicago',
  'MN': 'America/Chicago',
  'MS': 'America/Chicago',
  'MO': 'America/Chicago',
  'NE': 'America/Chicago', // Most of Nebraska is Central
  'ND': 'America/Chicago', // Most of North Dakota is Central
  'OK': 'America/Chicago',
  'SD': 'America/Chicago', // Most of South Dakota is Central
  'TX': 'America/Chicago', // Most of Texas is Central
  'WI': 'America/Chicago',
  
  // Mountain Time (MT)
  'AZ': 'America/Phoenix', // Arizona doesn't observe DST (except Navajo Nation)
  'CO': 'America/Denver',
  'ID': 'America/Boise', // Most of Idaho is Mountain
  'MT': 'America/Denver',
  'NV': 'America/Los_Angeles', // Most of Nevada is Pacific, but Vegas area is closer to Mountain
  'NM': 'America/Denver',
  'UT': 'America/Denver',
  'WY': 'America/Denver',
  
  // Pacific Time (PT)
  'CA': 'America/Los_Angeles',
  'OR': 'America/Los_Angeles', // Most of Oregon is Pacific
  'WA': 'America/Los_Angeles',
  
  // Alaska Time (AKT)
  'AK': 'America/Anchorage',
  
  // Hawaii-Aleutian Time (HST)
  'HI': 'Pacific/Honolulu',
  
  // US Territories
  'PR': 'America/Puerto_Rico', // Puerto Rico (Atlantic Time, no DST)
  'VI': 'America/Virgin', // US Virgin Islands (Atlantic Time, no DST)
  'GU': 'Pacific/Guam', // Guam (Chamorro Time)
  'AS': 'Pacific/Pago_Pago', // American Samoa
  'MP': 'Pacific/Guam', // Northern Mariana Islands
};

// Full state name to abbreviation mapping
const STATE_NAME_TO_CODE: Record<string, string> = {
  'alabama': 'AL',
  'alaska': 'AK',
  'arizona': 'AZ',
  'arkansas': 'AR',
  'california': 'CA',
  'colorado': 'CO',
  'connecticut': 'CT',
  'delaware': 'DE',
  'district of columbia': 'DC',
  'florida': 'FL',
  'georgia': 'GA',
  'hawaii': 'HI',
  'idaho': 'ID',
  'illinois': 'IL',
  'indiana': 'IN',
  'iowa': 'IA',
  'kansas': 'KS',
  'kentucky': 'KY',
  'louisiana': 'LA',
  'maine': 'ME',
  'maryland': 'MD',
  'massachusetts': 'MA',
  'michigan': 'MI',
  'minnesota': 'MN',
  'mississippi': 'MS',
  'missouri': 'MO',
  'montana': 'MT',
  'nebraska': 'NE',
  'nevada': 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  'ohio': 'OH',
  'oklahoma': 'OK',
  'oregon': 'OR',
  'pennsylvania': 'PA',
  'puerto rico': 'PR',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  'tennessee': 'TN',
  'texas': 'TX',
  'utah': 'UT',
  'vermont': 'VT',
  'virginia': 'VA',
  'washington': 'WA',
  'west virginia': 'WV',
  'wisconsin': 'WI',
  'wyoming': 'WY',
};

/**
 * Normalizes a state input to its 2-letter abbreviation
 */
function normalizeState(state: string): string | null {
  const trimmed = state.trim().toUpperCase();
  
  // If it's already a 2-letter code, use it directly
  if (trimmed.length === 2 && US_STATE_TIMEZONES[trimmed]) {
    return trimmed;
  }
  
  // Try to find by full name
  const normalized = state.trim().toLowerCase();
  const code = STATE_NAME_TO_CODE[normalized];
  return code || null;
}

/**
 * Detect timezone from a US state
 * @param state - US state (2-letter code or full name)
 * @returns IANA timezone string or null if not found
 */
export function getTimezoneFromState(state: string): string | null {
  const code = normalizeState(state);
  if (!code) return null;
  return US_STATE_TIMEZONES[code] || null;
}

/**
 * Detect timezone from an address object
 * @param address - Address object with state field
 * @returns IANA timezone string or null if not determinable
 */
export function getTimezoneFromAddress(address: {
  state?: string;
  city?: string;
  zipCode?: string;
} | null | undefined): string | null {
  if (!address?.state) return null;
  return getTimezoneFromState(address.state);
}

/**
 * Get a human-readable timezone name with UTC offset
 * @param timezone - IANA timezone string
 * @returns Human-readable string like "Eastern Time (ET) UTC-5"
 */
export function getTimezoneDisplayName(timezone: string): string {
  // This is a simple version - the TimezoneSelector component has the full mapping
  const parts = timezone.split('/');
  const location = parts[parts.length - 1].replace(/_/g, ' ');
  
  try {
    const date = new Date();
    const offsetStr = date.toLocaleString('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' })
      .split(' ')
      .pop() || '';
    const offset = offsetStr ? `-${offsetStr}` : '';
    return `${location} (${offset})`;
  } catch {
    return timezone;
  }
}

/**
 * Detect browser timezone
 * @returns IANA timezone string
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}
