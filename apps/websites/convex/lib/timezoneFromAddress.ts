/**
 * Utility for detecting timezone from address (Convex-side)
 * 
 * Maps US states to their primary IANA timezone.
 */

// US State to IANA timezone mapping
const US_STATE_TIMEZONES: Record<string, string> = {
  // Eastern Time (ET)
  'CT': 'America/New_York', 'DE': 'America/New_York', 'DC': 'America/New_York',
  'FL': 'America/New_York', 'GA': 'America/New_York', 'IN': 'America/Indiana/Indianapolis',
  'KY': 'America/New_York', 'ME': 'America/New_York', 'MD': 'America/New_York',
  'MA': 'America/New_York', 'MI': 'America/Detroit', 'NH': 'America/New_York',
  'NJ': 'America/New_York', 'NY': 'America/New_York', 'NC': 'America/New_York',
  'OH': 'America/New_York', 'PA': 'America/New_York', 'RI': 'America/New_York',
  'SC': 'America/New_York', 'TN': 'America/New_York', 'VT': 'America/New_York',
  'VA': 'America/New_York', 'WV': 'America/New_York',
  
  // Central Time (CT)
  'AL': 'America/Chicago', 'AR': 'America/Chicago', 'IL': 'America/Chicago',
  'IA': 'America/Chicago', 'KS': 'America/Chicago', 'LA': 'America/Chicago',
  'MN': 'America/Chicago', 'MS': 'America/Chicago', 'MO': 'America/Chicago',
  'NE': 'America/Chicago', 'ND': 'America/Chicago', 'OK': 'America/Chicago',
  'SD': 'America/Chicago', 'TX': 'America/Chicago', 'WI': 'America/Chicago',
  
  // Mountain Time (MT)
  'AZ': 'America/Phoenix', 'CO': 'America/Denver', 'ID': 'America/Boise',
  'MT': 'America/Denver', 'NV': 'America/Los_Angeles', 'NM': 'America/Denver',
  'UT': 'America/Denver', 'WY': 'America/Denver',
  
  // Pacific Time (PT)
  'CA': 'America/Los_Angeles', 'OR': 'America/Los_Angeles', 'WA': 'America/Los_Angeles',
  
  // Alaska & Hawaii
  'AK': 'America/Anchorage', 'HI': 'Pacific/Honolulu',
  
  // US Territories
  'PR': 'America/Puerto_Rico', 'VI': 'America/Virgin', 'GU': 'Pacific/Guam',
  'AS': 'Pacific/Pago_Pago', 'MP': 'Pacific/Guam',
};

// Full state name to abbreviation mapping
const STATE_NAME_TO_CODE: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'district of columbia': 'DC', 'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI',
  'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME',
  'maryland': 'MD', 'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN',
  'mississippi': 'MS', 'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE',
  'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM',
  'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'puerto rico': 'PR',
  'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD',
  'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY',
};

/**
 * Normalizes a state input to its 2-letter abbreviation
 */
function normalizeState(state: string): string | null {
  const trimmed = state.trim().toUpperCase();
  
  // If it's already a 2-letter code
  if (trimmed.length === 2 && US_STATE_TIMEZONES[trimmed]) {
    return trimmed;
  }
  
  // Try to find by full name
  const normalized = state.trim().toLowerCase();
  return STATE_NAME_TO_CODE[normalized] || null;
}

/**
 * Detect timezone from an address object
 */
export function getTimezoneFromAddress(address: {
  state?: string;
} | null | undefined): string | undefined {
  if (!address?.state) return undefined;
  
  const code = normalizeState(address.state);
  if (!code) return undefined;
  
  return US_STATE_TIMEZONES[code];
}
