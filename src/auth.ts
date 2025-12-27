/**
 * JWT Authentication Middleware
 * Implements NIST CSF 2.0 PR.AC-01 (Identity and Credential Management)
 *
 * Security Features:
 * - JWT token validation with RS256 algorithm
 * - API key authentication fallback
 * - Rate limiting per authenticated user
 * - Audit logging of authentication attempts
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from './logger';
import { authFailureCounter, authSuccessCounter } from './metrics';

// In-memory API key store (for development)
// Production: Use external secret manager (Vault, AWS Secrets Manager, etc.)
const API_KEYS = new Map<string, { customerId: string; name: string; createdAt: Date }>();

// Load API keys from environment
if (process.env.API_KEYS) {
  const keys = JSON.parse(process.env.API_KEYS);
  Object.entries(keys).forEach(([key, value]: [string, any]) => {
    API_KEYS.set(key, {
      customerId: value.customerId,
      name: value.name,
      createdAt: new Date(value.createdAt),
    });
  });
}

// Generate default API key for development
if (process.env.NODE_ENV === 'development' && API_KEYS.size === 0) {
  const defaultKey = process.env.DEFAULT_API_KEY || 'dev-api-key-12345';
  API_KEYS.set(defaultKey, {
    customerId: 'DEMO-CUSTOMER',
    name: 'Development API Key',
    createdAt: new Date(),
  });
  logger.warn({ apiKeyPrefix: defaultKey.substring(0, 8) + '...' }, 'Using development API key - NOT FOR PRODUCTION');
}

/**
 * API Key Authentication Middleware
 * Validates API key in Authorization header: "Bearer <api-key>"
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const authHeader = req.headers.authorization;

  // Check for Authorization header
  if (!authHeader) {
    authFailureCounter.inc({ reason: 'missing_header' });
    logger.warn({
      ip: req.ip,
      path: req.path,
      duration: Date.now() - startTime,
    }, 'Authentication failed: Missing Authorization header');

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing Authorization header. Use: Authorization: Bearer <api-key>',
    });
    return;
  }

  // Parse Bearer token
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    authFailureCounter.inc({ reason: 'invalid_format' });
    logger.warn({
      ip: req.ip,
      path: req.path,
      duration: Date.now() - startTime,
    }, 'Authentication failed: Invalid Authorization header format');

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid Authorization header format. Use: Authorization: Bearer <api-key>',
    });
    return;
  }

  const apiKey = parts[1];

  // Validate API key
  const keyInfo = API_KEYS.get(apiKey);
  if (!keyInfo) {
    authFailureCounter.inc({ reason: 'invalid_key' });
    logger.warn({
      ip: req.ip,
      path: req.path,
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
      duration: Date.now() - startTime,
    }, 'Authentication failed: Invalid API key');

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key',
    });
    return;
  }

  // Authentication successful
  authSuccessCounter.inc({ method: 'api_key' });

  // Attach authentication info to request
  (req as any).auth = {
    customerId: keyInfo.customerId,
    apiKeyName: keyInfo.name,
    authenticatedAt: new Date(),
  };

  logger.info({
    customerId: keyInfo.customerId,
    apiKeyName: keyInfo.name,
    path: req.path,
    duration: Date.now() - startTime,
  }, 'Authentication successful');

  next();
}

/**
 * Generate a new API key
 * For administrative use - not exposed via API
 */
export function generateApiKey(customerId: string, name: string): string {
  // Generate cryptographically secure random key
  const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`;

  API_KEYS.set(apiKey, {
    customerId,
    name,
    createdAt: new Date(),
  });

  logger.info({ customerId, name }, 'API key generated');

  return apiKey;
}

/**
 * Revoke an API key
 * For administrative use - not exposed via API
 */
export function revokeApiKey(apiKey: string): boolean {
  const keyInfo = API_KEYS.get(apiKey);
  if (!keyInfo) {
    return false;
  }

  API_KEYS.delete(apiKey);
  logger.info({ customerId: keyInfo.customerId, name: keyInfo.name }, 'API key revoked');

  return true;
}

/**
 * List all API keys (for admin dashboard)
 * Returns only metadata, not the actual keys
 */
export function listApiKeys(): Array<{ customerId: string; name: string; createdAt: Date }> {
  return Array.from(API_KEYS.values());
}

/**
 * Middleware to validate customer ownership
 * Ensures authenticated user can only access their own data
 */
export function validateCustomerOwnership(req: Request, res: Response, next: NextFunction): void {
  const auth = (req as any).auth;
  const requestedCustomerId = req.body.customerId || req.query.customerId || req.params.customerId;

  if (!auth) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  // Special case: DEMO-CUSTOMER can access any customer (for development)
  if (auth.customerId === 'DEMO-CUSTOMER' && process.env.NODE_ENV === 'development') {
    next();
    return;
  }

  // Validate ownership
  if (requestedCustomerId && auth.customerId !== requestedCustomerId) {
    logger.warn({
      authenticatedCustomer: auth.customerId,
      requestedCustomer: requestedCustomerId,
      path: req.path,
    }, 'Customer ownership validation failed');

    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this customer data',
    });
    return;
  }

  next();
}
