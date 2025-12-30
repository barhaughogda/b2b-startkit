/**
 * Date Parsing Utilities
 * 
 * Functions to parse dates from user's preferred format to ISO format (YYYY-MM-DD)
 * and vice versa, for use with date inputs that respect user preferences.
 */

import type { DateFormat } from './formatting';

/**
 * Parse a date string from user's preferred format to ISO format (YYYY-MM-DD)
 * 
 * @param dateString - Date string in user's preferred format
 * @param dateFormat - User's preferred date format
 * @returns ISO format date string (YYYY-MM-DD) or empty string if invalid
 * 
 * @example
 * parseDateFromFormat('31.12.2024', 'DD.MM.YYYY') // Returns '2024-12-31'
 * parseDateFromFormat('12/31/2024', 'MM/DD/YYYY') // Returns '2024-12-31'
 */
export function parseDateFromFormat(dateString: string, dateFormat: DateFormat): string {
  if (!dateString || !dateString.trim()) {
    return '';
  }

  const trimmed = dateString.trim();
  let day: string, month: string, year: string;

  try {
    switch (dateFormat) {
      case 'MM/DD/YYYY':
      case 'DD/MM/YYYY': {
        const parts = trimmed.split('/');
        if (parts.length !== 3) return '';
        if (dateFormat === 'MM/DD/YYYY') {
          month = parts[0]!;
          day = parts[1]!;
          year = parts[2]!;
        } else {
          day = parts[0]!;
          month = parts[1]!;
          year = parts[2]!;
        }
        break;
      }
      case 'YYYY-MM-DD': {
        const parts = trimmed.split('-');
        if (parts.length !== 3) return '';
        year = parts[0]!;
        month = parts[1]!;
        day = parts[2]!;
        break;
      }
      case 'DD.MM.YYYY': {
        const parts = trimmed.split('.');
        if (parts.length !== 3) return '';
        day = parts[0]!;
        month = parts[1]!;
        year = parts[2]!;
        break;
      }
      case 'DD MMM YYYY': {
        // Parse format like "31 Dec 2024"
        const parts = trimmed.split(' ');
        if (parts.length !== 3) return '';
        const dayPart = parts[0]!;
        const monthName = parts[1]!;
        const yearPart = parts[2]!;
        day = dayPart;
        year = yearPart;
        
        // Convert month name to number
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthIndex = monthNames.findIndex(m => m === monthName.toLowerCase().substring(0, 3));
        if (monthIndex === -1) return '';
        month = String(monthIndex + 1);
        break;
      }
      default:
        return '';
    }

    // Validate and pad
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
      return '';
    }

    // Validate ranges
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
      return '';
    }

    // Create date to validate (handles invalid dates like Feb 30)
    const testDate = new Date(yearNum, monthNum - 1, dayNum);
    if (
      testDate.getFullYear() !== yearNum ||
      testDate.getMonth() !== monthNum - 1 ||
      testDate.getDate() !== dayNum
    ) {
      return '';
    }

    // Return ISO format
    return `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

/**
 * Convert ISO date string (YYYY-MM-DD) to user's preferred format
 * 
 * @param isoDateString - ISO format date string (YYYY-MM-DD)
 * @param dateFormat - User's preferred date format
 * @returns Date string in user's preferred format
 * 
 * @example
 * formatDateToFormat('2024-12-31', 'DD.MM.YYYY') // Returns '31.12.2024'
 * formatDateToFormat('2024-12-31', 'MM/DD/YYYY') // Returns '12/31/2024'
 */
export function formatDateToFormat(isoDateString: string, dateFormat: DateFormat): string {
  if (!isoDateString || !isoDateString.trim()) {
    return '';
  }

  try {
    const date = new Date(isoDateString + 'T00:00:00');
    if (isNaN(date.getTime())) {
      return '';
    }

    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    const yyyy = String(year);

    switch (dateFormat) {
      case 'MM/DD/YYYY':
        return `${mm}/${dd}/${yyyy}`;
      case 'DD/MM/YYYY':
        return `${dd}/${mm}/${yyyy}`;
      case 'YYYY-MM-DD':
        return `${yyyy}-${mm}-${dd}`;
      case 'DD.MM.YYYY':
        return `${dd}.${mm}.${yyyy}`;
      case 'DD MMM YYYY': {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day} ${monthNames[month - 1]} ${yyyy}`;
      }
      default:
        return isoDateString;
    }
  } catch {
    return isoDateString;
  }
}

