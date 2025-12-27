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
   - API key-based authentication
   - Customer ownership validation
   - Rate limiting (100 req/min per IP)

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
  - Article 35: Data Protection Impact Assessment

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
