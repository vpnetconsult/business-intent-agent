/**
 * Response Filtering Utility
 * Implements OWASP API Security Top 10 - API3: Broken Object Property Level Authorization
 *
 * Purpose:
 * - Filter API responses based on user roles and permissions
 * - Prevent excessive data exposure
 * - Implement field-level access control
 * - Enforce principle of least privilege
 *
 * Security Controls:
 * - Role-based field whitelisting
 * - PII redaction for non-admin users
 * - Nested object filtering
 * - Audit logging of filtered responses
 */

import { logger } from './logger';

/**
 * User roles with different data access levels
 */
export enum UserRole {
  CUSTOMER = 'customer',        // Limited access - own data only, redacted PII
  AGENT = 'agent',              // Support agent - customer data, some PII
  ADMIN = 'admin',              // Full access - all data including PII
  SYSTEM = 'system',            // Internal system - full access
}

/**
 * Field permissions by role
 */
const FIELD_PERMISSIONS: Record<string, UserRole[]> = {
  // Customer Profile Fields
  'customer_id': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],
  'name': [UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM], // Hashed for customers
  'email': [UserRole.ADMIN, UserRole.SYSTEM], // Admin only
  'phone': [UserRole.ADMIN, UserRole.SYSTEM], // Admin only
  'segment': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],
  'location': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM], // Generalized for customers
  'contract_type': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],
  'current_services': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],
  'spending_tier': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],
  'preferences': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],
  'credit_score': [UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM], // Sensitive financial data

  // Quote Fields
  'quote_id': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],
  'products': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],
  'subtotal': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],
  'discounts': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],
  'discount_amount': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],
  'total_monthly': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],
  'currency': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],
  'valid_until': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],
  'terms': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],

  // Intent Analysis Fields
  'intent_analysis': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],
  'recommended_offer': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],
  'processing_time_ms': [UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN, UserRole.SYSTEM],

  // Internal/Debug Fields - Admin/System only
  'customer_profile_masked': [UserRole.ADMIN, UserRole.SYSTEM],
  'internal_score': [UserRole.ADMIN, UserRole.SYSTEM],
  'debug_info': [UserRole.ADMIN, UserRole.SYSTEM],
};

/**
 * Fields that should be redacted entirely for specific roles
 */
const REDACTED_FIELDS: Record<UserRole, string[]> = {
  [UserRole.CUSTOMER]: ['email', 'phone', 'credit_score'],
  [UserRole.AGENT]: ['email', 'phone'], // Agents see generalized data
  [UserRole.ADMIN]: [],
  [UserRole.SYSTEM]: [],
};

/**
 * Filter object properties based on user role
 */
export function filterResponseByRole(data: any, role: UserRole): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitive types
  if (typeof data !== 'object') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => filterResponseByRole(item, role));
  }

  const filtered: any = {};
  const removedFields: string[] = [];
  const redactedFields: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    // Check if role has permission to see this field
    const allowedRoles = FIELD_PERMISSIONS[key];

    if (allowedRoles && !allowedRoles.includes(role)) {
      // Role doesn't have permission - remove field entirely
      removedFields.push(key);
      continue;
    }

    // Check if field should be redacted for this role
    if (REDACTED_FIELDS[role]?.includes(key)) {
      filtered[key] = '[REDACTED]';
      redactedFields.push(key);
      continue;
    }

    // Recursively filter nested objects
    if (typeof value === 'object' && value !== null) {
      filtered[key] = filterResponseByRole(value, role);
    } else {
      filtered[key] = value;
    }
  }

  if (removedFields.length > 0 || redactedFields.length > 0) {
    logger.debug({
      role,
      removedFields,
      redactedFields,
    }, 'Response filtered by role');
  }

  return filtered;
}

/**
 * Filter customer profile specifically
 * Applies additional PII protection beyond role-based filtering
 */
export function filterCustomerProfile(profile: any, role: UserRole): any {
  if (!profile) {
    return profile;
  }

  const filtered = filterResponseByRole(profile, role);

  // Additional customer-specific filtering
  if (role === UserRole.CUSTOMER) {
    // Customers see generalized location (city, country only)
    if (filtered.location && typeof filtered.location === 'string') {
      const parts = filtered.location.split(',').map((p: string) => p.trim());
      if (parts.length >= 2) {
        filtered.location = parts.slice(-2).join(', ');
      }
    }

    // Generalize credit score to tier
    if (filtered.credit_score) {
      const scoreMap: Record<string, string> = {
        excellent: 'high',
        good: 'medium',
        fair: 'medium',
        poor: 'low',
      };
      filtered.credit_score = scoreMap[filtered.credit_score?.toLowerCase()] || 'unknown';
    }

    // Hash name for customers (they know their own name)
    if (filtered.name) {
      filtered.name_display = '[Authenticated User]';
      delete filtered.name;
    }
  }

  return filtered;
}

/**
 * Whitelist allowed input fields for mass assignment protection
 */
const ALLOWED_INPUT_FIELDS: Record<string, string[]> = {
  // Intent processing endpoint
  intent: ['customerId', 'intent', 'context'],

  // API key generation (admin only)
  generate_api_key: ['customerId', 'name'],

  // TMF921 Intent Management API
  tmf921_intent_create: [
    'name',
    'description',
    'intentType',
    'priority',
    'intentExpectation',
    'relatedParty',
    'intentSpecification',
    '@type',
    '@baseType',
    '@schemaLocation'
  ],

  tmf921_intent_update: [
    'name',
    'description',
    'priority',
    'state',
    'intentExpectation',
    '@type'
  ],
};

/**
 * Filter and validate input to prevent mass assignment
 * Only allows whitelisted fields through
 */
export function filterInput(data: any, endpoint: string): { filtered: any; violations: string[] } {
  const allowedFields = ALLOWED_INPUT_FIELDS[endpoint] || [];
  const filtered: any = {};
  const violations: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { filtered: data, violations };
  }

  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.includes(key)) {
      filtered[key] = value;
    } else {
      violations.push(`Unexpected field: ${key}`);
    }
  }

  if (violations.length > 0) {
    logger.warn({
      endpoint,
      violations,
      receivedFields: Object.keys(data),
      allowedFields,
    }, 'Mass assignment attempt detected');
  }

  return { filtered, violations };
}

/**
 * Get user role from authentication context
 */
export function getUserRole(auth: any): UserRole {
  if (!auth) {
    return UserRole.CUSTOMER; // Default to most restrictive
  }

  // Check for admin role
  if (auth.role === 'admin' || auth.customerId === 'ADMIN') {
    return UserRole.ADMIN;
  }

  // Check for agent role
  if (auth.role === 'agent' || auth.apiKeyName?.includes('Agent')) {
    return UserRole.AGENT;
  }

  // Check for system role
  if (auth.role === 'system' || auth.isSystem) {
    return UserRole.SYSTEM;
  }

  // Default to customer role
  return UserRole.CUSTOMER;
}

/**
 * Middleware to filter response before sending to client
 */
export function responseFilterMiddleware(req: any, res: any, next: any): void {
  const originalJson = res.json.bind(res);

  res.json = function (data: any) {
    const auth = req.auth;
    const role = getUserRole(auth);

    // Filter response based on role
    const filteredData = filterResponseByRole(data, role);

    logger.info({
      role,
      path: req.path,
      originalFields: Object.keys(data || {}).length,
      filteredFields: Object.keys(filteredData || {}).length,
    }, 'Response filtered by role');

    return originalJson(filteredData);
  };

  next();
}
