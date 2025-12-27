# Security Policy

## Supported Versions

| Version | Supported          | Security Updates |
| ------- | ------------------ | ---------------- |
| 1.1.x   | :white_check_mark: | Active           |
| 1.0.x   | :x:                | Unsupported      |
| < 1.0   | :x:                | Unsupported      |

## Reporting a Vulnerability

We take the security of the Business Intent Agent seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**DO NOT** create a public GitHub issue for security vulnerabilities.

Instead, please email: **security@vpnet.cloud**

Include the following information:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested remediation (if any)

### What to Expect

- **Acknowledgment:** Within 24 hours
- **Initial Assessment:** Within 72 hours
- **Status Updates:** Weekly
- **Fix Timeline:**
  - Critical: 7 days
  - High: 14 days
  - Medium: 30 days
  - Low: 90 days

### Disclosure Policy

- We follow **coordinated disclosure**
- Vulnerabilities will be disclosed after a fix is available
- Security advisories published via GitHub Security Advisories
- Credit given to reporter (unless anonymity requested)

### Scope

#### In Scope

- API authentication bypass
- Prompt injection attacks
- PII data leakage
- SQL/NoSQL injection
- Cross-Site Scripting (XSS)
- Server-Side Request Forgery (SSRF)
- Privilege escalation
- Sensitive data exposure
- Authentication/authorization flaws
- Cryptographic weaknesses

#### Out of Scope

- Denial of Service (DoS) attacks
- Social engineering attacks
- Physical security
- Issues in third-party dependencies (report to maintainers)
- Theoretical attacks without proof-of-concept
- Automated scanner reports without validation

## Security Features

### v1.1.0 Security Enhancements

1. **API Authentication**
   - API key-based authentication for business-intent-agent
   - **NEW:** MCP service authentication with API keys
   - Customer ownership validation
   - Rate limiting (100 req/min per key/IP)
   - HMAC request signing support

2. **PII Protection**
   - Automatic PII masking before AI processing
   - SHA-256 hashing of personal identifiers
   - Removal of high-risk fields (email, phone, SSN)
   - GDPR Article 32 compliance

3. **Prompt Injection Detection**
   - Pattern-based attack detection
   - Three-tier severity classification
   - Automatic blocking of high-severity attacks
   - Input sanitization

4. **Secrets Management**
   - No hardcoded credentials
   - Docker/Kubernetes secrets
   - Environment variable isolation

5. **Dependency Security**
   - Pinned dependency versions
   - Automated npm audit
   - Trivy container scanning
   - CodeQL static analysis

6. **Monitoring & Auditing**
   - Prometheus metrics for security events
   - Structured logging (Pino)
   - Authentication attempt tracking
   - PII masking operation tracking

## Known CVEs and Resolutions

### CVE-2023-45857: Axios SSRF Vulnerability

**Status:** ✅ **RESOLVED** (December 27, 2025)

| Attribute | Details |
|-----------|---------|
| **Severity** | Medium (CVSS 5.3) |
| **Component** | axios |
| **Vulnerable Versions** | < 1.6.0 |
| **Fixed In** | 1.6.0+ |
| **Current Version** | 1.13.2 ✓ |
| **Impact** | Server-Side Request Forgery through improper redirect handling |
| **Mitigation** | Updated axios to v1.13.2 with enhanced redirect validation |

**Description:** Axios versions prior to 1.6.0 were vulnerable to SSRF attacks allowing attackers to bypass proxy configurations and access internal services through malicious redirects.

**Resolution:** All instances of axios have been updated to v1.13.2, which includes proper redirect validation, enhanced proxy configuration enforcement, and improved URL parsing security.

**Verification:**
```bash
npm list axios
# business-intent-agent@1.0.0
# └── axios@1.13.2

npm audit
# found 0 vulnerabilities
```

**Related Commits:**
- `22104ed` - fix: Update dependencies to resolve security vulnerabilities

### CRIT-005: Unauthenticated MCP Service Access

**Status:** ✅ **RESOLVED** (December 27, 2025)

| Attribute | Details |
|-----------|---------|
| **Severity** | Critical (CVSS 9.1) |
| **Component** | MCP Services (customer-data, bss-oss, knowledge-graph) |
| **Vulnerability** | Missing authentication on all MCP endpoints |
| **Fixed In** | v1.1.0 |
| **Impact** | Unauthenticated access to sensitive customer data, product catalog, and business logic |
| **Mitigation** | Implemented comprehensive API key authentication with rate limiting and audit logging |

**Description:** All three MCP services (customer-data-mcp, bss-oss-mcp, knowledge-graph-mcp) accepted unauthenticated requests, allowing any client to access sensitive customer profiles, product catalogs, and business intelligence without authentication. This exposed PII data and business-critical information to potential unauthorized access.

**Resolution:** Implemented comprehensive authentication and security controls:

1. **API Key Authentication**
   - Cryptographically secure API keys (base64-encoded 32-byte random values)
   - Three-tier key system: BUSINESS_INTENT, ADMIN, MONITORING
   - Secure storage in Kubernetes secrets with rotation procedures

2. **Rate Limiting**
   - 100 requests per minute per API key
   - Configurable time windows
   - Prevents abuse and DoS attacks

3. **Request Signing Verification**
   - HMAC signature validation capability
   - Timestamp-based replay attack prevention
   - Optional for enhanced security

4. **Comprehensive Audit Logging**
   - All MCP requests logged with timestamp, client, endpoint, and result
   - Authentication failures tracked separately
   - Service-specific logging for correlation

5. **Health Check Exception**
   - Health endpoints remain accessible for monitoring
   - All business logic endpoints require authentication

**Verification:**
```bash
# Test unauthenticated request (should fail)
curl -X POST http://customer-data-mcp:8080/mcp/tools/call
# Response: 401 Unauthorized - Authentication required

# Test with valid API key (should succeed)
curl -X POST http://customer-data-mcp:8080/mcp/tools/call \
  -H "X-API-Key: $MCP_API_KEY_BUSINESS_INTENT"
# Response: 200 OK with data
```

**Affected Services:**
- customer-data-mcp-service:1.0.0 → 1.1.0
- bss-oss-mcp-service:1.0.0 → 1.1.0
- knowledge-graph-mcp-service:1.1.0 → 1.1.0

**Key Rotation Schedule:**
- Rotation required every 90 days
- Immediate rotation if compromise suspected
- Documented in `mcp-services-k8s/mcp-secrets.yaml`

### MED-001: Anthropic API Key Exposure Pattern

**Status:** ✅ **RESOLVED** (December 27, 2025)

| Attribute | Details |
|-----------|---------|
| **Severity** | Medium (CVSS 5.3) |
| **Component** | business-intent-agent |
| **Vulnerability** | API key exposed in environment variables |
| **Fixed In** | v1.1.0 |
| **Impact** | API key visible in process listings and container inspect commands |
| **Mitigation** | Implemented file-based secret reading with fallback to environment variables |

**Description:** The Anthropic API key was being loaded directly from environment variables (`ANTHROPIC_API_KEY`), making it visible in process listings (`ps aux`), container inspect commands (`docker inspect`), and Kubernetes pod descriptions. This exposure pattern increases the risk of credential leakage through various monitoring and debugging tools.

**Resolution:** Implemented a secure secret management pattern that prioritizes file-based secrets:

1. **Secrets Utility Module** (`src/secrets.ts`)
   - Dual-mode secret reading: file-based with environment variable fallback
   - File path specified via `<SECRET_NAME>_FILE` environment variable
   - Automatic secret trimming (removes whitespace/newlines)
   - Comprehensive logging for audit trail
   - Graceful error handling with fallback mechanism

2. **Kubernetes Configuration**
   - Secret mounted as file at `/run/secrets/anthropic_api_key`
   - Environment variable `ANTHROPIC_API_KEY_FILE` points to file path
   - Volume mount configured with read-only access
   - Secret file permissions managed by Kubernetes

3. **Docker Compose Configuration**
   - Docker Secrets integration (`/run/secrets/anthropic_api_key`)
   - Secret file sourced from `./secrets/anthropic_api_key.txt`
   - Consistent pattern with other service secrets (PostgreSQL, Neo4j, Grafana)

**Benefits:**
- ✅ API key not visible in environment variables
- ✅ Reduced exposure in process listings
- ✅ File permissions provide additional access control
- ✅ Backward compatible (environment variable fallback)
- ✅ Consistent with Docker/Kubernetes best practices

**Verification:**
```bash
# Kubernetes: Secret mounted as file
kubectl exec -it business-intent-agent-xxx -- ls -la /run/secrets/
# -r--r----- 1 root root 43 Dec 27 12:00 anthropic_api_key

# Environment variable points to file, not secret value
kubectl exec -it business-intent-agent-xxx -- env | grep ANTHROPIC
# ANTHROPIC_API_KEY_FILE=/run/secrets/anthropic_api_key

# Docker Compose: Secret accessible via file
docker exec business-intent-agent ls -la /run/secrets/
# -r--r----- 1 root root 43 Dec 27 12:00 anthropic_api_key
```

**Backward Compatibility:**
The implementation maintains backward compatibility by supporting both patterns:
- **Preferred**: `ANTHROPIC_API_KEY_FILE` (file path)
- **Fallback**: `ANTHROPIC_API_KEY` (direct value)

This allows gradual migration and ensures existing deployments continue functioning.

### API3: Broken Object Property Level Authorization

**Status:** ✅ **RESOLVED** (December 27, 2025)

| Attribute | Details |
|-----------|---------|
| **Severity** | Medium (CVSS 6.5) |
| **Component** | business-intent-agent API responses |
| **Vulnerability** | Excessive data exposure, no field-level access control, mass assignment |
| **Fixed In** | v1.1.0 |
| **Impact** | API responses contained sensitive PII regardless of user role |
| **Mitigation** | Implemented role-based field filtering and mass assignment protection |

**Description:** The API was returning complete customer profiles including sensitive PII (email, phone, credit scores) to all authenticated users without field-level authorization checks. Additionally, there was no mass assignment protection on input fields, allowing clients to potentially inject unexpected data.

**Vulnerabilities Identified:**
1. **Excessive Data Exposure**: All customer profile fields returned regardless of user role
2. **No Field-Level Authorization**: Same data returned to customers, agents, and admins
3. **Mass Assignment**: No input field whitelisting on POST endpoints
4. **PII Over-Sharing**: Email, phone numbers exposed in API responses

**Resolution:** Implemented comprehensive field-level authorization controls:

**1. Role-Based Access Control** (`src/response-filter.ts`)
- **Customer Role**: Limited access - own data only, PII redacted
  - Email, phone: `[REDACTED]`
  - Credit score: Generalized to tier (high/medium/low)
  - Location: City and country only
  - Name: Replaced with `[Authenticated User]`

- **Agent Role**: Support agent access - customer data, some PII
  - Can view customer profiles for support
  - Email and phone still redacted
  - Credit score visible for risk assessment

- **Admin Role**: Full access - all data including PII
  - Complete customer profiles
  - All financial data
  - Debug and internal fields

- **System Role**: Internal system - full access for integrations

**2. Field-Level Permissions Matrix**
```typescript
FIELD_PERMISSIONS = {
  'email': [Admin, System],              // Admin only
  'phone': [Admin, System],              // Admin only
  'credit_score': [Agent, Admin, System], // Not for customers
  'name': [Agent, Admin, System],        // Hashed for customers
  'customer_id': [All roles],             // All can see
  'segment': [All roles],                 // All can see
  // ... complete matrix in code
}
```

**3. Mass Assignment Protection**
- Input field whitelisting for all POST endpoints
- Only allowed fields accepted from client
- Unexpected fields trigger warning and rejection
- Audit logging of mass assignment attempts

**4. Response Filter Middleware**
- Automatic filtering of all API responses
- Applied globally to all endpoints
- Filters nested objects recursively
- Comprehensive audit logging

**Benefits:**
- ✅ PII exposure limited to authorized roles
- ✅ Principle of least privilege enforced
- ✅ Mass assignment attacks prevented
- ✅ Automatic response filtering (no developer errors)
- ✅ Comprehensive audit trail
- ✅ OWASP API Security Top 10 compliant

**Verification:**
```bash
# Customer role - limited data
curl -H "Authorization: Bearer customer-key" /api/v1/intent
{
  "customer_profile": {
    "customer_id": "CUST-001",
    "segment": "premium",
    "email": "[REDACTED]",      # ✅ Redacted
    "phone": "[REDACTED]",      # ✅ Redacted
    "credit_score": "high"      # ✅ Generalized
  }
}

# Admin role - full data
curl -H "Authorization: Bearer admin-key" /api/v1/intent
{
  "customer_profile": {
    "customer_id": "CUST-001",
    "email": "john@example.com",  # ✅ Visible
    "phone": "+353-1-234-5678",   # ✅ Visible
    "credit_score": "excellent"   # ✅ Detailed
  }
}

# Mass assignment protection
curl -X POST /api/v1/intent \
  -d '{"customerId":"CUST-001","intent":"upgrade","malicious":"field"}'
# Response: 400 Bad Request - "Request contains unexpected fields"
```

**OWASP API Security Compliance:**
- ✅ **API3:2023** - Broken Object Property Level Authorization (RESOLVED)
- ✅ **API6:2023** - Unrestricted Access to Sensitive Business Flows (MITIGATED)
- ✅ **API8:2023** - Security Misconfiguration (MITIGATED)

For detailed security audit results, see [SECURITY_REPORT.md](SECURITY_REPORT.md).

## Security Best Practices

### For Operators

1. **Credential Management**
   - Rotate API keys every 90 days
   - Use strong, unique passwords (32+ characters)
   - Never commit secrets to version control
   - Use external secret managers (Vault, AWS Secrets Manager)

2. **Network Security**
   - Always use HTTPS in production
   - Implement network policies in Kubernetes
   - Restrict ingress to necessary ports only
   - Use VPN for admin access

3. **Monitoring**
   - Set up alerts for authentication failures
   - Monitor prompt injection detection metrics
   - Review security logs daily
   - Set up SIEM integration

4. **Updates**
   - Apply security patches within 7 days
   - Subscribe to security advisories
   - Test updates in staging first
   - Maintain rollback plan

### For Developers

1. **Input Validation**
   - Validate all user input
   - Use prompt injection detection for AI inputs
   - Sanitize data before logging
   - Escape special characters

2. **Authentication**
   - Never bypass authentication checks
   - Implement least privilege access
   - Validate JWT tokens correctly
   - Use secure session management

3. **Data Protection**
   - Always mask PII before external API calls
   - Encrypt sensitive data at rest
   - Use HTTPS for all external communication
   - Implement proper access controls

4. **Code Security**
   - Run npm audit before commits
   - Review dependencies for vulnerabilities
   - Use parameterized queries (avoid string concatenation)
   - Implement proper error handling (don't leak stack traces)

## Compliance

### Frameworks

- ✅ **NIST CSF 2.0**
  - GV.RM-04: Risk response
  - PR.AC-01: Identity and credential management
  - PR.DS-01: Data-at-rest protection
  - PR.DS-05: Protections against data leaks
  - DE.CM-01: Network monitoring

- ✅ **GDPR**
  - Article 5(1)(c): Data minimization
  - Article 32: Security of processing
  - Article 33: Breach notification (72 hours)
  - Article 35: Data Protection Impact Assessment - [DPIA.md](DPIA.md)

- ✅ **OWASP Top 10**
  - A01:2021 - Broken Access Control
  - A02:2021 - Cryptographic Failures
  - A03:2021 - Injection
  - A07:2021 - Identification and Authentication Failures

- ✅ **OWASP Top 10 for LLMs**
  - LLM01: Prompt Injection
  - LLM02: Insecure Output Handling
  - LLM06: Sensitive Information Disclosure

### Audits

- **Last Security Assessment:** December 27, 2025 (Dependency & CVE Audit)
- **Previous Assessment:** December 26, 2025 (NIST CSF 2.0)
- **Next Planned Audit:** January 27, 2026 (Monthly)
- **Penetration Test:** Planned for Q1 2026
- **Detailed Report:** [SECURITY_REPORT.md](SECURITY_REPORT.md)
- **GDPR DPIA:** [DPIA.md](DPIA.md)

## Incident Response

See [INCIDENT_RESPONSE.md](INCIDENT_RESPONSE.md) for detailed procedures.

### Quick Reference

| Severity | Response Time | Escalation |
|----------|---------------|------------|
| Critical | < 15 minutes  | CISO, CEO  |
| High     | < 1 hour      | CISO       |
| Medium   | < 4 hours     | Security Lead |
| Low      | < 24 hours    | Security Team |

## Security Contacts

- **Security Team:** security@vpnet.cloud
- **Data Protection Officer:** dpo@vpnet.cloud
- **CISO:** ciso@vpnet.cloud
- **24/7 Hotline:** +1-XXX-XXX-XXXX (Production only)

## Bug Bounty Program

**Status:** Coming Soon (Q1 2026)

Planned rewards:
- Critical: €5,000 - €10,000
- High: €2,000 - €5,000
- Medium: €500 - €2,000
- Low: €100 - €500

## Hall of Fame

Security researchers who have responsibly disclosed vulnerabilities:

| Researcher | Vulnerability | Severity | Date |
|------------|---------------|----------|------|
| _(none yet)_ | - | - | - |

---

**Last Updated:** December 27, 2025
**Version:** 1.1.0
**Classification:** PUBLIC
**Security Report:** [SECURITY_REPORT.md](SECURITY_REPORT.md)
**GDPR DPIA:** [DPIA.md](DPIA.md)
