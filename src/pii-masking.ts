/**
 * PII Masking Utility
 * Implements GDPR Article 32 (Security of Processing) and NIST CSF 2.0 PR.DS-01
 *
 * Purpose:
 * - Anonymize/pseudonymize PII before sending to external AI services
 * - Minimize data exposure to third parties
 * - Comply with data minimization principles
 *
 * Approach:
 * - Hash PII fields with SHA-256 (deterministic for consistency)
 * - Remove highly sensitive fields entirely
 * - Preserve business-critical non-PII fields
 * - Log all masking operations for audit
 */

import crypto from 'crypto';
import { logger } from './logger';
import { piiMaskingOperations } from './metrics';

// Salt for hashing (should be stored in secret manager in production)
const HASH_SALT = process.env.PII_HASH_SALT || 'default-salt-change-in-production';

/**
 * PII field classification
 */
const PII_FIELDS = {
  // High-risk PII - Remove entirely
  HIGH_RISK: ['email', 'phone', 'ssn', 'credit_card', 'bank_account', 'passport'],

  // Medium-risk PII - Hash/pseudonymize
  MEDIUM_RISK: ['name', 'address', 'location', 'ip_address'],

  // Financial data - Remove or generalize
  FINANCIAL: ['credit_score', 'income', 'debt', 'account_balance'],

  // Safe for AI processing - Preserve
  SAFE: [
    'segment',
    'spending_tier',
    'preferences',
    'contract_type',
    'current_services',
    'customer_id', // Already anonymized by business
  ],
};

/**
 * Hash a string value with SHA-256 (deterministic)
 */
function hashValue(value: string, fieldName: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${HASH_SALT}:${fieldName}:${value}`)
    .digest('hex');

  return `${fieldName}_${hash.substring(0, 16)}`; // Return first 16 chars for readability
}

/**
 * Generalize a location to city/region only
 */
function generalizeLocation(location: string): string {
  // Extract city/region only (remove detailed addresses)
  // Example: "123 Main St, Dublin, Ireland" -> "Dublin, Ireland"
  const parts = location.split(',').map((p) => p.trim());

  if (parts.length >= 2) {
    // Return last 2 parts (city, country)
    return parts.slice(-2).join(', ');
  }

  return location; // Return as-is if format is unexpected
}

/**
 * Generalize credit score to tier
 */
function generalizeCreditScore(score: string): string {
  const scoreMap: { [key: string]: string } = {
    excellent: 'high',
    good: 'medium',
    fair: 'medium',
    poor: 'low',
  };

  return scoreMap[score.toLowerCase()] || 'unknown';
}

/**
 * Mask PII fields in customer profile
 */
export function maskCustomerProfile(profile: any): any {
  const startTime = Date.now();
  const maskedProfile: any = {};
  const maskedFields: string[] = [];
  const removedFields: string[] = [];

  // Process each field
  for (const [key, value] of Object.entries(profile)) {
    if (value === null || value === undefined) {
      maskedProfile[key] = value;
      continue;
    }

    // HIGH RISK - Remove entirely
    if (PII_FIELDS.HIGH_RISK.includes(key)) {
      removedFields.push(key);
      piiMaskingOperations.inc({ field: key, operation: 'remove' });
      continue; // Don't include in masked profile
    }

    // MEDIUM RISK - Hash/pseudonymize
    if (PII_FIELDS.MEDIUM_RISK.includes(key)) {
      if (key === 'location') {
        maskedProfile[key] = generalizeLocation(String(value));
        maskedFields.push(key);
        piiMaskingOperations.inc({ field: key, operation: 'generalize' });
      } else {
        maskedProfile[key] = hashValue(String(value), key);
        maskedFields.push(key);
        piiMaskingOperations.inc({ field: key, operation: 'hash' });
      }
      continue;
    }

    // FINANCIAL - Generalize
    if (PII_FIELDS.FINANCIAL.includes(key)) {
      if (key === 'credit_score') {
        maskedProfile[key] = generalizeCreditScore(String(value));
        maskedFields.push(key);
        piiMaskingOperations.inc({ field: key, operation: 'generalize' });
      } else {
        // Remove other financial data
        removedFields.push(key);
        piiMaskingOperations.inc({ field: key, operation: 'remove' });
      }
      continue;
    }

    // SAFE - Preserve as-is
    if (PII_FIELDS.SAFE.includes(key)) {
      maskedProfile[key] = value;
      piiMaskingOperations.inc({ field: key, operation: 'preserve' });
      continue;
    }

    // Unknown field - preserve with warning
    logger.warn({ field: key }, 'Unknown field type in customer profile - preserving as-is');
    maskedProfile[key] = value;
  }

  const processingTime = Date.now() - startTime;

  logger.info(
    {
      maskedFields,
      removedFields,
      processingTime,
    },
    'PII masking completed'
  );

  return maskedProfile;
}

/**
 * Mask PII in any object (generic)
 */
export function maskPII(data: any, fieldsToMask: string[]): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const masked = Array.isArray(data) ? [...data] : { ...data };

  for (const field of fieldsToMask) {
    if (field in masked) {
      if (typeof masked[field] === 'string') {
        masked[field] = hashValue(masked[field], field);
        piiMaskingOperations.inc({ field, operation: 'hash' });
      }
    }
  }

  return masked;
}

/**
 * Validate that PII has been masked before sending to external service
 */
export function validateNoRawPII(data: any): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  function checkObject(obj: any, path: string = '') {
    if (typeof obj !== 'object' || obj === null) return;

    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;

      // Check for high-risk PII fields
      if (PII_FIELDS.HIGH_RISK.includes(key)) {
        violations.push(`High-risk PII field found: ${fullPath}`);
      }

      // Check for email patterns
      if (typeof value === 'string' && /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(value)) {
        violations.push(`Email pattern detected: ${fullPath}`);
      }

      // Recursively check nested objects
      if (typeof value === 'object' && value !== null) {
        checkObject(value, fullPath);
      }
    }
  }

  checkObject(data);

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Redact sensitive data from logs
 */
export function redactForLogs(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const redacted = Array.isArray(data) ? [...data] : { ...data };

  const sensitivePatterns = [
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL_REDACTED]' },
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN_REDACTED]' },
    { pattern: /\b\d{16}\b/g, replacement: '[CARD_REDACTED]' },
    { pattern: /\b\d{3}-\d{3}-\d{4}\b/g, replacement: '[PHONE_REDACTED]' },
  ];

  function redactString(str: string): string {
    let result = str;
    for (const { pattern, replacement } of sensitivePatterns) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }

  function redactObject(obj: any): any {
    if (typeof obj === 'string') {
      return redactString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(redactObject);
    }

    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Redact sensitive keys entirely
        if (PII_FIELDS.HIGH_RISK.includes(key)) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = redactObject(value);
        }
      }
      return result;
    }

    return obj;
  }

  return redactObject(redacted);
}
