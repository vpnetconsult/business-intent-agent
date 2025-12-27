# PII Masking and Data Minimization

This document explains how the Business Intent Agent protects customer PII when using external AI services.

## Overview

As of v1.1.0, the Business Intent Agent implements **PII masking** before sending customer data to Claude AI (Anthropic API). This complies with:

- ✅ **GDPR Article 32** - Security of Processing
- ✅ **GDPR Article 5(1)(c)** - Data Minimization
- ✅ **NIST CSF 2.0 PR.DS-01** - Data-at-rest protection
- ✅ **OWASP Top 10 for LLMs** - LLM06 (Sensitive Information Disclosure)

## Problem Statement

### Before PII Masking (v1.0.0)

The entire customer profile was sent to Claude AI without modification:

```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "location": "123 Main St, Dublin, Ireland",
  "segment": "premium",
  "credit_score": "excellent",
  "spending_tier": "high"
}
```

**Risks:**
- PII exposure to third-party AI provider (Anthropic)
- GDPR violation (no data minimization)
- Potential data breach if Anthropic is compromised
- Regulatory fines up to €20M (4% of revenue)

### After PII Masking (v1.1.0)

Customer profile is anonymized before sending to Claude AI:

```json
{
  "name": "name_a1b2c3d4e5f6789a",
  "location": "Dublin, Ireland",
  "segment": "premium",
  "credit_score": "high",
  "spending_tier": "high",
  "current_services": ["mobile_basic", "broadband_100mb"]
}
```

**Benefits:**
- ✅ PII is pseudonymized (hashed with SHA-256)
- ✅ High-risk fields removed entirely (email, phone, SSN)
- ✅ Location generalized to city/country only
- ✅ Financial data generalized (credit_score: excellent → high)
- ✅ Business-critical fields preserved (segment, spending_tier)

## PII Field Classification

### High-Risk PII (Removed Entirely)

| Field | Example | Action |
|-------|---------|--------|
| email | john.doe@example.com | **REMOVE** |
| phone | +353-1-234-5678 | **REMOVE** |
| ssn | 123-45-6789 | **REMOVE** |
| credit_card | 1234-5678-9012-3456 | **REMOVE** |
| bank_account | IE29AIBK93115212345678 | **REMOVE** |
| passport | P1234567 | **REMOVE** |

### Medium-Risk PII (Hashed/Pseudonymized)

| Field | Example | Masked Value | Method |
|-------|---------|--------------|--------|
| name | John Doe | name_a1b2c3d4e5f6789a | SHA-256 hash (first 16 chars) |
| address | 123 Main St | address_b2c3d4e5f6789abc | SHA-256 hash |
| ip_address | 192.168.1.1 | ip_address_c3d4e5f6789abcde | SHA-256 hash |

### Financial Data (Generalized)

| Field | Original | Generalized | Reason |
|-------|----------|-------------|--------|
| credit_score | excellent | high | Business logic needs tier, not exact score |
| credit_score | good/fair | medium | Group into broader categories |
| credit_score | poor | low | Minimize sensitivity |
| income | €75,000 | [REMOVED] | Not needed for intent analysis |
| debt | €15,000 | [REMOVED] | Not needed for recommendations |

### Location Data (Generalized)

| Original | Generalized | Reason |
|----------|-------------|--------|
| 123 Main St, Dublin, Ireland | Dublin, Ireland | City-level granularity sufficient |
| Apt 5B, Cork, Ireland | Cork, Ireland | Remove street address |
| London, UK | London, UK | Already generalized |

### Safe Fields (Preserved)

| Field | Example | Reason |
|-------|---------|--------|
| customer_id | CUST-12345 | Already anonymized by business |
| segment | premium | Business segmentation, not PII |
| spending_tier | high | Aggregated behavior, not PII |
| contract_type | prepaid | Business data, not PII |
| current_services | ["mobile_basic"] | Service codes, not PII |
| preferences | {"channel": "digital"} | Business preferences, not PII |

## Technical Implementation

### Hashing Algorithm

```typescript
// Deterministic SHA-256 hashing with salt
const hash = crypto
  .createHash('sha256')
  .update(`${SALT}:${fieldName}:${value}`)
  .digest('hex')
  .substring(0, 16); // First 16 chars for readability

// Result: "name_a1b2c3d4e5f6789a"
```

**Why deterministic?**
- Same customer always gets same hash
- Enables grouping/aggregation in analytics
- Consistent across multiple API calls

**Why salted?**
- Prevents rainbow table attacks
- Salt stored in Kubernetes secret (`PII_HASH_SALT`)
- Salt should be rotated every 180 days

### Validation

Before sending data to Claude AI, the system validates no raw PII remains:

```typescript
const validation = validateNoRawPII(maskedProfile);
if (!validation.valid) {
  throw new Error(`PII validation failed: ${validation.violations.join(', ')}`);
}
```

**Checks:**
- ✅ No high-risk PII fields present
- ✅ No email patterns (regex validation)
- ✅ No phone patterns
- ✅ No credit card patterns

### Metrics

PII masking operations are tracked in Prometheus:

```promql
# Total masking operations by field and operation type
pii_masking_operations_total{field="name", operation="hash"}
pii_masking_operations_total{field="email", operation="remove"}
pii_masking_operations_total{field="location", operation="generalize"}
pii_masking_operations_total{field="segment", operation="preserve"}
```

### Logging

Customer profiles are redacted in logs:

```typescript
logger.debug({
  originalProfile: redactForLogs(customerProfile), // Redacted
  maskedProfile // Safe to log (already masked)
}, 'Customer profile masked');
```

**Redaction patterns:**
- Email: `john.doe@example.com` → `[EMAIL_REDACTED]`
- SSN: `123-45-6789` → `[SSN_REDACTED]`
- Card: `1234567890123456` → `[CARD_REDACTED]`
- Phone: `123-456-7890` → `[PHONE_REDACTED]`

## API Response

The API returns both original and masked profiles for transparency:

```json
{
  "intent_analysis": { ... },
  "customer_profile": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "segment": "premium"
  },
  "customer_profile_masked": {
    "name": "name_a1b2c3d4e5f6789a",
    "segment": "premium"
  },
  "recommended_offer": { ... }
}
```

**Note:** Only authenticated clients receive the `customer_profile` field. The `customer_profile_masked` field shows exactly what was sent to Claude AI.

## Configuration

### Environment Variables

```bash
# PII hashing salt (REQUIRED in production)
PII_HASH_SALT=your-cryptographically-random-salt-here

# Development mode (relaxed validation)
NODE_ENV=development
```

### Kubernetes Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: business-intent-agent-secrets
stringData:
  pii-hash-salt: "YOUR_SECURE_RANDOM_SALT_HERE"
```

**Generate secure salt:**
```bash
openssl rand -base64 32
```

## GDPR Compliance

### Data Minimization (Article 5(1)(c))

**Requirement:** Personal data shall be adequate, relevant and limited to what is necessary.

**Implementation:**
- ✅ Only send essential fields to Claude AI
- ✅ Remove high-risk PII entirely
- ✅ Generalize financial data
- ✅ Pseudonymize personal identifiers

### Security of Processing (Article 32)

**Requirement:** Appropriate technical and organizational measures to ensure data security.

**Implementation:**
- ✅ Pseudonymization of personal data
- ✅ Encryption in transit (HTTPS to Anthropic API)
- ✅ Access controls (API key authentication)
- ✅ Audit logging of all PII access

### Data Protection Impact Assessment (DPIA)

**Question:** Do we still need a DPIA?

**Answer:** Yes, if:
- Processing large-scale personal data
- Systematic monitoring of customers
- Using automated decision-making

**Recommendation:** Conduct DPIA within 60 days of production launch.

## Data Processing Agreement (DPA)

### With Anthropic

**Requirement:** GDPR Article 28 requires DPA with all data processors.

**Status:** ⚠️ **PENDING**

**Action Required:**
1. Review Anthropic's DPA: https://www.anthropic.com/legal/dpa
2. Sign DPA before production launch
3. Verify Anthropic's GDPR compliance
4. Confirm data residency (EU data stays in EU)

### Key DPA Clauses

- **Data retention:** How long does Anthropic keep data?
- **Sub-processors:** Who else can access the data?
- **Security measures:** What encryption/controls exist?
- **Data breach notification:** Within 72 hours?
- **Data deletion:** Can we request deletion?

## Testing PII Masking

### Unit Test

```bash
npm test -- pii-masking.test.ts
```

### Manual Test

```bash
# 1. Start the service
kubectl port-forward -n intent-platform svc/business-intent-agent-service 8080:8080

# 2. Call API
curl -X POST http://localhost:8080/api/v1/intent \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer dev-api-key-12345' \
  -d '{
    "customerId": "CUST-12345",
    "intent": "I need faster internet"
  }'

# 3. Verify response contains both profiles
# - customer_profile: Original (full PII)
# - customer_profile_masked: What was sent to Claude AI

# 4. Check logs for PII masking operations
kubectl logs -n intent-platform -l app=business-intent-agent | grep "PII masking"
```

### Prometheus Metrics

```bash
# Open Prometheus
kubectl port-forward -n intent-platform svc/prometheus-service 9090:9090

# Query metrics
http://localhost:9090/graph?g0.expr=pii_masking_operations_total
```

## Troubleshooting

### Error: "PII validation failed: High-risk PII field found: email"

**Cause:** Masked profile still contains email field.

**Solution:**
1. Check PII_FIELDS.HIGH_RISK includes 'email'
2. Verify maskCustomerProfile() removes the field
3. Check customer profile source (MCP service)

### Error: "PII_HASH_SALT environment variable not set"

**Cause:** Missing PII_HASH_SALT in deployment.

**Solution:**
```bash
# Update Kubernetes secret
kubectl edit secret business-intent-agent-secrets -n intent-platform

# Add:
stringData:
  pii-hash-salt: "your-random-salt-here"

# Restart deployment
kubectl rollout restart deployment/business-intent-agent -n intent-platform
```

### Metrics not showing up

**Solution:**
```bash
# Check Prometheus scrape config
kubectl get configmap prometheus-config -n intent-platform -o yaml

# Verify service has metrics endpoint
curl http://localhost:8080/metrics | grep pii_masking
```

## Future Enhancements

### Phase 2 (90 days)

1. **Dynamic PII Detection**
   - ML-based PII detection
   - Auto-detect new PII fields
   - Support for custom PII patterns

2. **Field-Level Encryption**
   - Encrypt PII fields at rest
   - Use customer-managed keys (CMK)
   - Homomorphic encryption for analytics

3. **Differential Privacy**
   - Add statistical noise to aggregates
   - Prevent reverse engineering of individuals
   - Implement ε-differential privacy

### Phase 3 (180 days)

1. **Zero-Knowledge Proofs**
   - Prove properties without revealing data
   - Enable analytics without data exposure

2. **Federated Learning**
   - Train models without centralizing data
   - Customer data stays on-premise

3. **Confidential Computing**
   - Use Intel SGX / AMD SEV for AI processing
   - Encrypt data in use (not just at rest/transit)

## Compliance Checklist

Before production launch:

- ✅ PII masking implemented and tested
- ✅ Validation prevents raw PII to external AI
- ✅ Prometheus metrics tracking masking operations
- ✅ Audit logs redact sensitive data
- ⬜ Data Processing Agreement signed with Anthropic
- ⬜ Data Protection Impact Assessment completed
- ⬜ Legal review of GDPR compliance
- ⬜ Privacy policy updated to mention AI processing
- ⬜ Customer consent for AI-powered recommendations
- ⬜ Data retention policy defined
- ⬜ Data deletion mechanism implemented

## Support

For PII masking questions:
- **Email:** privacy@vpnet.cloud
- **DPO (Data Protection Officer):** dpo@vpnet.cloud
- **Security:** security@vpnet.cloud

---

**Last Updated:** December 26, 2025
**Applies To:** Business Intent Agent v1.1.0+
**Classification:** INTERNAL USE ONLY
