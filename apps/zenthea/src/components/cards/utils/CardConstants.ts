/**
 * Card System Constants
 * 
 * This file contains layout constants and utility functions
 * extracted from BaseCard.tsx for better organization.
 */

// Layout constants - allow free movement across entire screen
export const MIN_CARD_Y_POSITION = 0; // Allow cards to go to top of screen

export const MAX_CARD_Y_POSITION = (): number => {
  if (typeof window === 'undefined') return 800; // SSR fallback
  return window.innerHeight; // Allow cards to go to bottom of screen
};

export const MIN_CARD_X_POSITION = 0; // Allow cards to go to left edge

export const MAX_CARD_X_POSITION = (): number => {
  if (typeof window === 'undefined') return 1200; // SSR fallback
  return window.innerWidth; // Allow cards to go to right edge
};

// Utility function to truncate text with ellipsis
export const truncateText = (text: string, maxLength: number = 30): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

// Card type display names mapping
export const getCardTypeName = (type: string): string => {
  switch (type) {
    case 'appointment': return 'Appointment';
    case 'message': return 'Message';
    case 'labResult': return 'Lab Result';
    case 'vitalSigns': return 'Vital Signs';
    case 'soapNote': return 'SOAP Note';
    case 'prescription': return 'Prescription';
    case 'procedure': return 'Procedure';
    case 'diagnosis': return 'Diagnosis';
    default: return 'Card';
  }
};

// Generate contextual information based on card type and data
export const getContextualInfo = (type: string, title: string, dueDate?: string): string => {
  switch (type) {
    case 'appointment':
      // For appointments, show date/time if available
      if (dueDate) {
        const date = new Date(dueDate);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
        
        if (isToday) {
          return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (isTomorrow) {
          return `Tomorrow ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
          return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
      }
      return 'Scheduled';
      
    case 'labResult':
      // For lab results, show test type from title or generic
      if (title && title !== 'Lab Result') {
        return title.split(' ').slice(0, 2).join(' '); // First 2 words of title
      }
      return 'Test Results';
      
    case 'message':
      // For messages, show sender or generic
      if (title && title !== 'Message') {
        return title.split(' ').slice(0, 2).join(' '); // First 2 words of title
      }
      return 'New Message';
      
    case 'vitalSigns':
      // For vital signs, show latest reading or generic
      if (title && title !== 'Vital Signs') {
        return title.split(' ').slice(0, 2).join(' '); // First 2 words of title
      }
      return 'Latest Reading';
      
    case 'soapNote':
      // For SOAP notes, show note type or generic
      if (title && title !== 'SOAP Note') {
        return title.split(' ').slice(0, 2).join(' '); // First 2 words of title
      }
      return 'Clinical Note';
      
    case 'prescription':
      // For prescriptions, show medication or generic
      if (title && title !== 'Prescription') {
        return title.split(' ').slice(0, 2).join(' '); // First 2 words of title
      }
      return 'Medication';
      
    case 'procedure':
      // For procedures, show procedure type or generic
      if (title && title !== 'Procedure') {
        return title.split(' ').slice(0, 2).join(' '); // First 2 words of title
      }
      return 'Medical Procedure';
      
    case 'diagnosis':
      // For diagnosis, show condition or generic
      if (title && title !== 'Diagnosis') {
        return title.split(' ').slice(0, 2).join(' '); // First 2 words of title
      }
      return 'Medical Diagnosis';
      
    default:
      return 'Task';
  }
};

// Generate minimized card display text based on card type and context
export const getMinimizedCardText = (type: string, title: string, dueDate?: string): string => {
  const cardTypeName = getCardTypeName(type);
  const contextualInfo = getContextualInfo(type, title, dueDate);
  
  // Return formatted text: "Card Type - Context"
  return `${cardTypeName} - ${contextualInfo}`;
};
