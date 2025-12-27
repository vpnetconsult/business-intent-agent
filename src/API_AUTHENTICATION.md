# API Authentication Guide

This document explains how to authenticate with the Business Intent Agent API.

## Overview

As of v1.1.0, all API endpoints (except `/health`, `/ready`, `/metrics`) require authentication to comply with NIST CSF 2.0 PR.AC-01 (Identity and Credential Management).

## Authentication Method: API Key

The Business Intent Agent uses API key authentication with Bearer tokens.

### Authentication Header Format

```
Authorization: Bearer <api-key>
```

## Getting an API Key

### Development Environment

For development and testing, a default API key is automatically generated:

```bash
# Default development API key
DEFAULT_API_KEY=dev-api-key-12345
```

This key grants access to the `DEMO-CUSTOMER` customer ID, which can access any customer data in development mode.

### Production Environment

#### Option 1: Generate API Key via Admin Endpoint

```bash
curl -X POST http://localhost:8080/api/v1/admin/generate-api-key \
  -H 'Content-Type: application/json' \
  -H 'X-Admin-Secret: your-admin-secret' \
  -d '{
    "customerId": "CUST-12345",
    "name": "Production API Key"
  }'
```

**Response:**
```json
{
  "apiKey": "sk_a1b2c3d4e5f6...",
  "customerId": "CUST-12345",
  "name": "Production API Key",
  "createdAt": "2025-12-26T18:00:00.000Z",
  "expiresAt": null
}
```

**Store this API key securely** - it will not be shown again!

#### Option 2: Programmatic Generation

```typescript
import { generateApiKey } from './auth';

const apiKey = generateApiKey('CUST-12345', 'My Application');
console.log('Generated API key:', apiKey);
```

## Using the API with Authentication

### Example: Process Customer Intent

```bash
curl -X POST http://localhost:8080/api/v1/intent \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer dev-api-key-12345' \
  -d '{
    "customerId": "CUST-12345",
    "intent": "I need faster internet for work from home"
  }'
```

**Success Response (200 OK):**
```json
{
  "intent_analysis": {
    "primary_intent": "upgrade_internet_speed",
    "customer_segment": "residential",
    "urgency": "medium"
  },
  "recommended_offer": {
    "name": "Premium Broadband Bundle",
    "price": "$79.99/month",
    "features": ["500 Mbps", "Unlimited data", "Free router"]
  },
  "processing_time_ms": 2847
}
```

## Error Responses

### 401 Unauthorized: Missing Authorization Header

```json
{
  "error": "Unauthorized",
  "message": "Missing Authorization header. Use: Authorization: Bearer <api-key>"
}
```

### 401 Unauthorized: Invalid API Key

```json
{
  "error": "Unauthorized",
  "message": "Invalid API key"
}
```

### 403 Forbidden: Customer Ownership Violation

```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this customer data"
}
```

## Customer Ownership Validation

API keys are scoped to a specific customer ID. Requests can only access data for the customer associated with the API key.

**Example:**
- API Key `sk_abc123...` is associated with `CUST-12345`
- ✅ Valid request: `{"customerId": "CUST-12345", "intent": "..."}`
- ❌ Invalid request: `{"customerId": "CUST-99999", "intent": "..."}` (returns 403 Forbidden)

**Exception:** The development key `DEMO-CUSTOMER` can access any customer ID when `NODE_ENV=development`.

## Security Best Practices

### ✅ DO:

1. **Store API keys securely**
   - Use environment variables
   - Use secret managers (Vault, AWS Secrets Manager, etc.)
   - Never commit keys to version control

2. **Rotate API keys regularly**
   - Recommended: Every 90 days
   - Immediately rotate if compromised

3. **Use HTTPS in production**
   - API keys in HTTP headers are visible in plaintext
   - Always use TLS/SSL

4. **Monitor authentication metrics**
   - Track failed authentication attempts
   - Alert on unusual patterns
   - Review Prometheus metrics: `auth_failure_total`, `auth_success_total`

5. **Implement rate limiting**
   - Default: 100 requests per minute per IP
   - Configure via environment variables

### ❌ DON'T:

1. **Don't share API keys**
   - Each application should have its own key
   - Use descriptive names to track usage

2. **Don't log API keys**
   - Keys are automatically redacted in logs
   - Only key prefixes (first 8 chars) are logged

3. **Don't use the development key in production**
   - `dev-api-key-12345` is for development only
   - Generate production keys via admin endpoint

4. **Don't embed keys in client-side code**
   - API keys should only be used server-side
   - Use OAuth 2.0 for client applications (future enhancement)

## Environment Variables

### Application Configuration

```bash
# Development mode (enables default API key)
NODE_ENV=development

# Default API key for development
DEFAULT_API_KEY=dev-api-key-12345

# Admin secret for key generation endpoint
ADMIN_SECRET=change-me-in-production

# Pre-configured API keys (JSON format)
API_KEYS='{"sk_prod123...":{"customerId":"CUST-001","name":"Production App","createdAt":"2025-12-26T00:00:00Z"}}'
```

### Kubernetes Secret Configuration

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: business-intent-agent-secrets
  namespace: intent-platform
type: Opaque
stringData:
  admin-secret: "your-secure-admin-secret-here"
  default-api-key: "dev-api-key-12345"
```

## Prometheus Metrics

Monitor authentication activity via Prometheus:

### Metrics

```promql
# Total successful authentications by method
auth_success_total{method="api_key"}

# Total failed authentications by reason
auth_failure_total{reason="missing_header"}
auth_failure_total{reason="invalid_format"}
auth_failure_total{reason="invalid_key"}

# Authentication success rate
rate(auth_success_total[5m]) / (rate(auth_success_total[5m]) + rate(auth_failure_total[5m]))
```

### Grafana Dashboard Queries

```promql
# Failed authentication attempts (last 1h)
sum(increase(auth_failure_total[1h])) by (reason)

# Top IP addresses by failed auth attempts
topk(10, sum by (ip) (increase(auth_failure_total[1h])))
```

## API Key Management

### List API Keys (Admin)

```typescript
import { listApiKeys } from './auth';

const keys = listApiKeys();
console.log(keys);
// Output: [
//   { customerId: 'CUST-001', name: 'Production App', createdAt: '2025-12-26...' },
//   { customerId: 'CUST-002', name: 'Mobile App', createdAt: '2025-12-26...' }
// ]
```

### Revoke API Key (Admin)

```typescript
import { revokeApiKey } from './auth';

const revoked = revokeApiKey('sk_abc123...');
if (revoked) {
  console.log('API key revoked successfully');
} else {
  console.log('API key not found');
}
```

## Future Enhancements

The following authentication features are planned:

1. **OAuth 2.0 Support** (Phase 2)
   - Client credentials flow for service-to-service
   - Authorization code flow for web applications
   - Token refresh and expiration

2. **JWT Tokens** (Phase 2)
   - Stateless authentication
   - Token expiration and renewal
   - Claims-based authorization

3. **Multi-Factor Authentication** (Phase 3)
   - TOTP-based MFA for admin endpoints
   - SMS/email verification

4. **API Key Expiration** (Phase 2)
   - Automatic key rotation
   - Expiration notifications
   - Grace period for key transition

5. **Role-Based Access Control** (Phase 3)
   - Admin, user, read-only roles
   - Fine-grained permissions
   - Customer data isolation

## Troubleshooting

### Issue: "Invalid API key" even with correct key

**Solution:**
1. Verify the API key is correctly formatted (no extra spaces)
2. Check if the key exists: `listApiKeys()`
3. Verify environment variable `API_KEYS` is loaded
4. Check logs for authentication attempts: `kubectl logs -n intent-platform -l app=business-intent-agent`

### Issue: "Forbidden" error when accessing own customer data

**Solution:**
1. Verify the `customerId` in your request matches the API key's customer
2. Check the API key metadata: `listApiKeys()`
3. If using development mode, ensure `NODE_ENV=development`

### Issue: Admin endpoint returns "Unauthorized"

**Solution:**
1. Verify `X-Admin-Secret` header is set correctly
2. Check environment variable `ADMIN_SECRET`
3. For Kubernetes: verify secret is mounted correctly

## Support

For authentication-related issues:
- Email: security@vpnet.cloud
- Incident Response: Follow INCIDENT_RESPONSE.md
- Security Vulnerability: See SECURITY.md

---

**Last Updated:** December 26, 2025
**Applies To:** Business Intent Agent v1.1.0+
**Classification:** INTERNAL USE ONLY
