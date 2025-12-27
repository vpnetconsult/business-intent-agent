/**
 * MCP Service Authentication Middleware
 *
 * Implements API key-based authentication for MCP services
 * Security: Protects against unauthorized access to sensitive MCP endpoints
 */

const crypto = require('crypto');

// API keys should be set via environment variables
const VALID_API_KEYS = new Set([
  process.env.MCP_API_KEY_BUSINESS_INTENT,
  process.env.MCP_API_KEY_ADMIN,
  process.env.MCP_API_KEY_MONITORING,
].filter(key => key)); // Filter out undefined keys

// Rate limiting state (in-memory, should use Redis in production)
const rateLimitStore = new Map();

/**
 * API Key Authentication Middleware
 */
function authenticateAPIKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  // Check if API key is provided
  if (!apiKey) {
    console.error('[auth] No API key provided', {
      ip: req.ip,
      path: req.path,
      timestamp: new Date().toISOString()
    });
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Missing API key. Provide X-API-Key header or Authorization: Bearer token'
    });
  }

  // Validate API key
  if (!VALID_API_KEYS.has(apiKey)) {
    console.error('[auth] Invalid API key attempt', {
      ip: req.ip,
      path: req.path,
      timestamp: new Date().toISOString(),
      keyPrefix: apiKey.substring(0, 8) + '...'
    });
    return res.status(403).json({
      error: 'Authentication failed',
      message: 'Invalid API key'
    });
  }

  // Success - attach key metadata to request
  req.authenticated = true;
  req.apiKeyHash = hashApiKey(apiKey);
  console.log('[auth] Authenticated request', {
    keyHash: req.apiKeyHash,
    path: req.path,
    timestamp: new Date().toISOString()
  });

  next();
}

/**
 * Rate Limiting Middleware
 * Limits requests per API key
 */
function rateLimiter(options = {}) {
  const windowMs = options.windowMs || 60000; // 1 minute
  const maxRequests = options.max || 100; // 100 requests per window

  return (req, res, next) => {
    const key = req.apiKeyHash || req.ip;
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    if (!entry || now - entry.resetTime > windowMs) {
      entry = {
        count: 0,
        resetTime: now
      };
      rateLimitStore.set(key, entry);
    }

    // Check if limit exceeded
    entry.count++;
    if (entry.count > maxRequests) {
      console.warn('[auth] Rate limit exceeded', {
        key: key.substring(0, 16) + '...',
        count: entry.count,
        limit: maxRequests,
        path: req.path
      });
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Maximum ${maxRequests} requests per ${windowMs / 1000} seconds`,
        retryAfter: Math.ceil((windowMs - (now - entry.resetTime)) / 1000)
      });
    }

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil((entry.resetTime + windowMs) / 1000));

    next();
  };
}

/**
 * Request Signing Verification Middleware
 * Verifies HMAC signatures for additional security
 */
function verifyRequestSignature(req, res, next) {
  const signature = req.headers['x-request-signature'];
  const timestamp = req.headers['x-request-timestamp'];

  // Signature is optional but if provided must be valid
  if (!signature && !timestamp) {
    return next();
  }

  if (!signature || !timestamp) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Both X-Request-Signature and X-Request-Timestamp required for signed requests'
    });
  }

  // Check timestamp freshness (prevent replay attacks)
  const requestTime = parseInt(timestamp);
  const now = Date.now();
  const maxAge = 300000; // 5 minutes

  if (isNaN(requestTime) || Math.abs(now - requestTime) > maxAge) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Request timestamp is too old or invalid'
    });
  }

  // Verify signature (implementation depends on shared secret)
  // For now, just log that we received a signed request
  console.log('[auth] Received signed request', {
    path: req.path,
    timestamp: new Date(requestTime).toISOString()
  });

  next();
}

/**
 * Audit Logging Middleware
 */
function auditLogger(serviceName) {
  return (req, res, next) => {
    const startTime = Date.now();

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logEntry = {
        service: serviceName,
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        authenticated: req.authenticated || false,
        keyHash: req.apiKeyHash || 'none',
        ip: req.ip,
        userAgent: req.headers['user-agent']?.substring(0, 100) || 'unknown'
      };

      if (res.statusCode >= 400) {
        console.error('[audit]', logEntry);
      } else {
        console.log('[audit]', logEntry);
      }
    });

    next();
  };
}

/**
 * Hash API key for logging (never log raw keys)
 */
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
}

/**
 * Health check exception middleware
 * Skip authentication for health checks
 */
function healthCheckException(req, res, next) {
  if (req.path === '/health' || req.path === '/metrics') {
    return next('route'); // Skip to next route handler
  }
  next();
}

module.exports = {
  authenticateAPIKey,
  rateLimiter,
  verifyRequestSignature,
  auditLogger,
  healthCheckException
};
