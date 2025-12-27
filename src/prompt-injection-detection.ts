/**
 * Prompt Injection Detection
 * Implements OWASP Top 10 for LLMs - LLM01 (Prompt Injection)
 *
 * Purpose:
 * - Detect and block prompt injection attacks
 * - Prevent jailbreak attempts
 * - Sanitize user input before sending to AI
 * - Protect system prompts from manipulation
 *
 * Attack Patterns:
 * - Direct injection: "Ignore previous instructions..."
 * - Indirect injection: Embedded in data fields
 * - Context manipulation: Changing AI role/behavior
 * - Data exfiltration: Extracting system prompts
 */

import { logger } from './logger';
import { promptInjectionDetections } from './metrics';

/**
 * Prompt injection patterns (signatures)
 */
const INJECTION_PATTERNS = {
  // High severity - Direct jailbreak attempts
  HIGH: [
    /ignore\s+(previous|all|prior)\s+(instructions?|directions?|commands?)/i,
    /forget\s+(everything|all|previous)/i,
    /disregard\s+(previous|all|prior)/i,
    /system\s*:\s*you\s+are\s+(now|a)/i,
    /new\s+instructions?\s*:/i,
    /you\s+are\s+no\s+longer/i,
    /pretend\s+(you\s+are|to\s+be)/i,
    /roleplay\s+as/i,
    /act\s+as\s+(a|an)\s+(?!customer|user)/i, // Allow "act as a customer"
    /simulate\s+(being|a)/i,
    /your\s+new\s+(role|instructions?|purpose)/i,
    /repeat\s+(the|your)\s+(prompt|instructions?|system)/i,
    /reveal\s+(the|your)\s+(prompt|instructions?|system)/i,
    /what\s+(is|are)\s+your\s+(instructions?|prompt|system)/i,
    /show\s+me\s+your\s+(prompt|instructions?)/i,
  ],

  // Medium severity - Context manipulation
  MEDIUM: [
    /admin\s+mode/i,
    /developer\s+mode/i,
    /debug\s+mode/i,
    /maintenance\s+mode/i,
    /override\s+(settings?|config|rules?)/i,
    /bypass\s+(restrictions?|filters?|safety)/i,
    /disable\s+(safety|filters?|guardrails?)/i,
    /enable\s+(admin|debug|god)\s+mode/i,
    /execute\s+(code|command|script)/i,
    /run\s+(code|script|command)/i,
    /<script.*?>.*?<\/script>/is, // XSS attempts
    /javascript:/i,
    /on(load|error|click)\s*=/i, // Event handlers
  ],

  // Low severity - Suspicious patterns (may be benign)
  LOW: [
    /\[system\]/i,
    /\[admin\]/i,
    /\[root\]/i,
    /sudo\s+/i,
    /rm\s+-rf/i,
    /drop\s+table/i, // SQL injection attempts
    /union\s+select/i,
    /or\s+1\s*=\s*1/i,
    /exec\s*\(/i,
    /eval\s*\(/i,
  ],
};

/**
 * Suspicious character sequences
 */
const SUSPICIOUS_SEQUENCES = [
  '\\x', // Hex escape sequences
  '\\u', // Unicode escape sequences
  '\\n'.repeat(10), // Excessive newlines
  ' '.repeat(50), // Excessive spaces
  '{{', // Template injection attempts
  '}}',
  '${', // Variable injection
];

/**
 * Detection result
 */
export interface PromptInjectionResult {
  isInjection: boolean;
  severity: 'high' | 'medium' | 'low' | 'clean';
  confidence: number; // 0-100
  patterns: string[];
  sanitizedInput?: string;
  blocked: boolean;
}

/**
 * Configuration
 */
const config = {
  // Block HIGH severity automatically
  blockHigh: true,

  // Block MEDIUM severity (configurable)
  blockMedium: process.env.BLOCK_MEDIUM_INJECTION === 'true',

  // Block LOW severity (configurable, default: false)
  blockLow: process.env.BLOCK_LOW_INJECTION === 'true',

  // Maximum input length (prevent DoS)
  maxInputLength: parseInt(process.env.MAX_INPUT_LENGTH || '10000'),

  // Enable input sanitization
  enableSanitization: process.env.ENABLE_SANITIZATION !== 'false',
};

/**
 * Detect prompt injection attempts
 */
export function detectPromptInjection(input: string): PromptInjectionResult {
  const startTime = Date.now();
  const detectedPatterns: string[] = [];
  let severity: 'high' | 'medium' | 'low' | 'clean' = 'clean';

  // Check input length (DoS prevention)
  if (input.length > config.maxInputLength) {
    logger.warn({ inputLength: input.length }, 'Input exceeds maximum length');
    promptInjectionDetections.inc({ severity: 'high', pattern: 'excessive_length' });
    return {
      isInjection: true,
      severity: 'high',
      confidence: 100,
      patterns: ['excessive_length'],
      blocked: true,
    };
  }

  // Check HIGH severity patterns
  for (const pattern of INJECTION_PATTERNS.HIGH) {
    if (pattern.test(input)) {
      detectedPatterns.push(pattern.toString());
      severity = 'high';
    }
  }

  // Check MEDIUM severity patterns (if not already HIGH)
  if (severity !== 'high') {
    for (const pattern of INJECTION_PATTERNS.MEDIUM) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.toString());
        severity = 'medium';
      }
    }
  }

  // Check LOW severity patterns (if not already HIGH or MEDIUM)
  if (severity !== 'high' && severity !== 'medium') {
    for (const pattern of INJECTION_PATTERNS.LOW) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.toString());
        severity = 'low';
      }
    }
  }

  // Check suspicious character sequences
  if (severity === 'clean') {
    for (const sequence of SUSPICIOUS_SEQUENCES) {
      if (input.includes(sequence)) {
        detectedPatterns.push(`suspicious_sequence: ${sequence}`);
        severity = 'low';
      }
    }
  }

  const isInjection = severity !== 'clean';
  const confidence = isInjection ? calculateConfidence(severity, detectedPatterns.length) : 0;

  // Determine if should be blocked
  const blocked =
    (severity === 'high' && config.blockHigh) ||
    (severity === 'medium' && config.blockMedium) ||
    (severity === 'low' && config.blockLow);

  // Log detection
  if (isInjection) {
    logger.warn(
      {
        severity,
        confidence,
        patternsDetected: detectedPatterns.length,
        blocked,
        inputPreview: input.substring(0, 100), // First 100 chars only
        processingTime: Date.now() - startTime,
      },
      'Prompt injection attempt detected'
    );

    promptInjectionDetections.inc({ severity, pattern: detectedPatterns[0] || 'unknown' });
  }

  // Sanitize if not blocked
  const sanitizedInput = blocked ? undefined : config.enableSanitization ? sanitizeInput(input) : input;

  return {
    isInjection,
    severity,
    confidence,
    patterns: detectedPatterns,
    sanitizedInput,
    blocked,
  };
}

/**
 * Calculate confidence score
 */
function calculateConfidence(severity: string, patternCount: number): number {
  const baseConfidence = {
    high: 90,
    medium: 70,
    low: 40,
  }[severity] || 0;

  // Increase confidence with more patterns detected
  const bonusPerPattern = 5;
  const bonus = Math.min((patternCount - 1) * bonusPerPattern, 10);

  return Math.min(baseConfidence + bonus, 100);
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  let sanitized = input;
  let previousLength = 0;

  // Iteratively remove dangerous patterns until no more changes occur
  // This prevents bypass attacks like <scr<script>ipt>
  while (sanitized.length !== previousLength) {
    previousLength = sanitized.length;

    // Remove HTML tags (including malformed/nested ones)
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Remove script tags with any attributes or variations (including spaces in closing tags)
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/\s*script\s*>/gis, '');

    // Remove any remaining script-like patterns
    sanitized = sanitized.replace(/script/gi, '');

    // Remove event handlers (comprehensive patterns) - remove entire attribute
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["']?[^"'\s>]*["']?/gi, '');
  }

  // Remove JavaScript protocol (after loop to catch encoded versions)
  sanitized = sanitized.replace(/javascript\s*:/gi, '');
  sanitized = sanitized.replace(/data\s*:text\/html/gi, '');
  sanitized = sanitized.replace(/vbscript\s*:/gi, '');

  // Remove excessive newlines/spaces
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  sanitized = sanitized.replace(/\s{3,}/g, ' ');

  // Remove control characters (except newline, tab, carriage return)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');

  // Normalize Unicode to prevent homograph attacks
  sanitized = sanitized.normalize('NFKC');

  return sanitized.trim();
}

/**
 * Validate intent input (combines injection detection + sanitization)
 */
export function validateIntentInput(intent: string): { valid: boolean; error?: string; sanitized?: string } {
  const detection = detectPromptInjection(intent);

  if (detection.blocked) {
    return {
      valid: false,
      error: `Prompt injection detected (${detection.severity} severity). This request has been blocked for security reasons.`,
    };
  }

  if (detection.isInjection && !config.enableSanitization) {
    // Detected but not blocked, and sanitization disabled
    logger.warn({ severity: detection.severity }, 'Prompt injection detected but not blocked');
  }

  return {
    valid: true,
    sanitized: detection.sanitizedInput || intent,
  };
}

/**
 * Batch validation for multiple inputs
 */
export function validateBatchInputs(inputs: string[]): {
  valid: boolean;
  results: PromptInjectionResult[];
  blocked: string[];
} {
  const results = inputs.map(detectPromptInjection);
  const blockedIndices = results.reduce((acc, r, i) => {
    if (r.blocked) acc.push(String(i));
    return acc;
  }, [] as string[]);

  return {
    valid: blockedIndices.length === 0,
    results,
    blocked: blockedIndices,
  };
}

/**
 * Generate security report (for admin dashboard)
 */
export function generateSecurityReport(_timeWindowMinutes: number = 60): {
  totalAttempts: number;
  byCategory: { high: number; medium: number; low: number };
  topPatterns: { pattern: string; count: number }[];
} {
  // This would query Prometheus metrics in a real implementation
  // For now, return placeholder
  return {
    totalAttempts: 0,
    byCategory: { high: 0, medium: 0, low: 0 },
    topPatterns: [],
  };
}
