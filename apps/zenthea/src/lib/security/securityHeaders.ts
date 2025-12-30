/**
 * Security Headers Validation
 * 
 * This module provides validation for security headers required for HIPAA compliance
 * and general web security best practices.
 */

export interface SecurityHeaders {
  'X-Frame-Options'?: string;
  'X-Content-Type-Options'?: string;
  'X-XSS-Protection'?: string;
  'Strict-Transport-Security'?: string;
  'Content-Security-Policy'?: string;
  'X-HIPAA-Compliant'?: string;
  'Referrer-Policy'?: string;
  'Permissions-Policy'?: string;
}

export interface SecurityHeaderValidation {
  header: string;
  present: boolean;
  valid: boolean;
  value?: string;
  recommendation?: string;
}

/**
 * Validate security headers for HIPAA compliance
 */
export function validateSecurityHeaders(headers: SecurityHeaders): SecurityHeaderValidation[] {
  const validations: SecurityHeaderValidation[] = [];
  
  // X-Frame-Options validation
  validations.push({
    header: 'X-Frame-Options',
    present: !!headers['X-Frame-Options'],
    valid: headers['X-Frame-Options'] === 'DENY' || headers['X-Frame-Options'] === 'SAMEORIGIN',
    value: headers['X-Frame-Options'],
    recommendation: headers['X-Frame-Options'] ? undefined : 'Set X-Frame-Options to DENY or SAMEORIGIN'
  });
  
  // X-Content-Type-Options validation
  validations.push({
    header: 'X-Content-Type-Options',
    present: !!headers['X-Content-Type-Options'],
    valid: headers['X-Content-Type-Options'] === 'nosniff',
    value: headers['X-Content-Type-Options'],
    recommendation: headers['X-Content-Type-Options'] ? undefined : 'Set X-Content-Type-Options to nosniff'
  });
  
  // X-XSS-Protection validation
  validations.push({
    header: 'X-XSS-Protection',
    present: !!headers['X-XSS-Protection'],
    valid: headers['X-XSS-Protection'] === '1; mode=block',
    value: headers['X-XSS-Protection'],
    recommendation: headers['X-XSS-Protection'] ? undefined : 'Set X-XSS-Protection to 1; mode=block'
  });
  
  // Strict-Transport-Security validation
  const hstsValid = headers['Strict-Transport-Security']?.includes('max-age=31536000') && 
                   headers['Strict-Transport-Security']?.includes('includeSubDomains') || false;
  validations.push({
    header: 'Strict-Transport-Security',
    present: !!headers['Strict-Transport-Security'],
    valid: hstsValid,
    value: headers['Strict-Transport-Security'],
    recommendation: headers['Strict-Transport-Security'] ? undefined : 'Set Strict-Transport-Security with max-age=31536000; includeSubDomains'
  });
  
  // Content-Security-Policy validation
  const cspValid = 
    headers['Content-Security-Policy']?.includes("default-src 'self'") &&
    headers['Content-Security-Policy']?.includes("https://challenges.cloudflare.com") || false;
  validations.push({
    header: 'Content-Security-Policy',
    present: !!headers['Content-Security-Policy'],
    valid: cspValid,
    value: headers['Content-Security-Policy'],
    recommendation: headers['Content-Security-Policy'] ? undefined : 'Set Content-Security-Policy with default-src \'self\''
  });
  
  // X-HIPAA-Compliant validation
  validations.push({
    header: 'X-HIPAA-Compliant',
    present: !!headers['X-HIPAA-Compliant'],
    valid: headers['X-HIPAA-Compliant'] === 'true',
    value: headers['X-HIPAA-Compliant'],
    recommendation: headers['X-HIPAA-Compliant'] ? undefined : 'Set X-HIPAA-Compliant to true'
  });
  
  // Referrer-Policy validation
  validations.push({
    header: 'Referrer-Policy',
    present: !!headers['Referrer-Policy'],
    valid: ['strict-origin-when-cross-origin', 'strict-origin', 'no-referrer'].includes(headers['Referrer-Policy'] || ''),
    value: headers['Referrer-Policy'],
    recommendation: headers['Referrer-Policy'] ? undefined : 'Set Referrer-Policy to strict-origin-when-cross-origin'
  });
  
  // Permissions-Policy validation
  validations.push({
    header: 'Permissions-Policy',
    present: !!headers['Permissions-Policy'],
    valid: !!headers['Permissions-Policy'],
    value: headers['Permissions-Policy'],
    recommendation: headers['Permissions-Policy'] ? undefined : 'Set Permissions-Policy to restrict unnecessary features'
  });
  
  return validations;
}

/**
 * Get recommended security headers for HIPAA compliance
 */
export function getRecommendedSecurityHeaders(): SecurityHeaders {
  const isProd = process.env.NODE_ENV === 'production';
  const upgradeInsecure = isProd ? "; upgrade-insecure-requests" : "";

  return {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': `default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'${upgradeInsecure};`,
    'X-HIPAA-Compliant': 'true',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
  };
}

/**
 * Calculate security headers compliance score
 */
export function calculateSecurityHeadersScore(validations: SecurityHeaderValidation[]): number {
  const totalHeaders = validations.length;
  const validHeaders = validations.filter(v => v.valid).length;
  return Math.round((validHeaders / totalHeaders) * 100);
}

/**
 * Generate security headers report
 */
export function generateSecurityHeadersReport(validations: SecurityHeaderValidation[]): string {
  const score = calculateSecurityHeadersScore(validations);
  const validCount = validations.filter(v => v.valid).length;
  const totalCount = validations.length;
  
  let report = `Security Headers Compliance Report\n`;
  report += `================================\n\n`;
  report += `Overall Score: ${score}/100\n`;
  report += `Valid Headers: ${validCount}/${totalCount}\n\n`;
  
  report += `Header Details:\n`;
  validations.forEach(validation => {
    const status = validation.valid ? '✅' : '❌';
    report += `${status} ${validation.header}: ${validation.value || 'Not Set'}\n`;
    if (validation.recommendation) {
      report += `   Recommendation: ${validation.recommendation}\n`;
    }
  });
  
  return report;
}
