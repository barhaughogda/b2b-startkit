/**
 * Date formatting utilities
 * 
 * Centralized date formatting functions for consistent date display
 * across the application.
 */

/**
 * Formats a date string to a readable format
 * 
 * @param dateString - ISO date string or date string in various formats
 * @param options - Optional formatting options
 * @returns Formatted date string (e.g., "2/15/2024")
 * 
 * @example
 * formatDate('2024-02-15T10:00:00.000Z') // Returns "2/15/2024"
 * formatDate('2024-02-15', { month: 'long' }) // Returns "February 15, 2024"
 */
export function formatDate(
  dateString: string,
  options?: {
    month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
    day?: 'numeric' | '2-digit';
    year?: 'numeric' | '2-digit';
    weekday?: 'long' | 'short' | 'narrow';
  }
): string {
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      // If parsing fails, try to handle formats like "2024-01-15"
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const parsedDate = new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2])
        );
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toLocaleDateString('en-US', {
            month: options?.month || 'numeric',
            day: options?.day || 'numeric',
            year: options?.year || 'numeric',
            weekday: options?.weekday,
          });
        }
      }
      return dateString; // Return as-is if can't parse
    }
    
    return date.toLocaleDateString('en-US', {
      month: options?.month || 'numeric',
      day: options?.day || 'numeric',
      year: options?.year || 'numeric',
      weekday: options?.weekday,
    });
  } catch {
    return dateString;
  }
}

/**
 * Formats a date string with time
 * 
 * @param dateString - ISO date string
 * @param options - Optional formatting options
 * @returns Formatted date and time string
 * 
 * @example
 * formatDateTime('2024-02-15T10:30:00.000Z') // Returns "2/15/2024, 10:30 AM"
 */
export function formatDateTime(
  dateString: string,
  options?: {
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
    timeStyle?: 'full' | 'long' | 'medium' | 'short';
  }
): string {
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return dateString;
    }
    
    return date.toLocaleString('en-US', {
      dateStyle: options?.dateStyle || 'short',
      timeStyle: options?.timeStyle || 'short',
    });
  } catch {
    return dateString;
  }
}

/**
 * Formats a relative time (e.g., "2 hours ago", "Just now")
 * 
 * @param timestamp - ISO timestamp string
 * @returns Relative time string
 * 
 * @example
 * formatRelativeTime('2024-02-15T10:00:00.000Z') // Returns "2h ago" or "Just now"
 */
export function formatRelativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      if (diffInMinutes < 1) {
        return 'Just now';
      }
      return `${diffInMinutes}m ago`;
    }
    
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }
    
    return formatDate(timestamp);
  } catch {
    return timestamp;
  }
}

