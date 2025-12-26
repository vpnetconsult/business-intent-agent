# Incident Response Plan

**Document Version:** 1.0
**Last Updated:** December 26, 2025
**Applies To:** Business Intent Agent v1.1.0+
**Classification:** CONFIDENTIAL - Internal Use Only

---

## Table of Contents

1. [Overview](#overview)
2. [Incident Classification](#incident-classification)
3. [Response Team](#response-team)
4. [Response Procedures](#response-procedures)
5. [Communication Plan](#communication-plan)
6. [Runbooks](#runbooks)
7. [Post-Incident Review](#post-incident-review)

---

## Overview

This document outlines the procedures for responding to security incidents affecting the Business Intent Agent.

### Objectives

- **Detect** security incidents quickly
- **Respond** effectively to minimize impact
- **Recover** services and data
- **Learn** from incidents to prevent recurrence
- **Comply** with regulatory requirements (GDPR 72-hour breach notification)

### Scope

This plan covers:
- Security breaches (unauthorized access, data leaks)
- Service disruptions (DoS attacks, system failures)
- Data integrity issues (unauthorized modifications)
- Compliance violations (GDPR, PCI-DSS)
- Supply chain compromises (dependency vulnerabilities)

---

## Incident Classification

### Severity Levels

| Severity | Definition | Examples | Response Time | Escalation |
|----------|------------|----------|---------------|------------|
| **CRITICAL (P0)** | Immediate threat to data, customers, or operations | - Active data breach<br>- Ransomware attack<br>- Production system compromise<br>- Mass PII exposure | < 15 minutes | CISO, CEO, Board |
| **HIGH (P1)** | Significant security risk or service degradation | - Authentication bypass<br>- Privilege escalation<br>- Sustained DoS attack<br>- Customer data exposure | < 1 hour | CISO, CTO |
| **MEDIUM (P2)** | Moderate risk, limited impact | - Failed intrusion attempt<br>- Vulnerability in non-production<br>- Policy violation | < 4 hours | Security Lead |
| **LOW (P3)** | Minor risk, no immediate threat | - Suspicious activity (investigated, benign)<br>- Configuration drift<br>- Audit findings | < 24 hours | Security Team |

### GDPR Data Breach Assessment

If personal data is involved, assess if it's a "data breach" under GDPR Article 33:

- **Is it a breach?** Unauthorized access, loss, or destruction of personal data
- **Notify DPA?** Within 72 hours if "likely to result in risk to rights and freedoms"
- **Notify data subjects?** If "high risk" to individuals

---

## Response Team

### Incident Response Team (IRT)

| Role | Responsibilities | Contact |
|------|------------------|---------|
| **Incident Commander** | Lead response, make decisions | CISO |
| **Security Engineer** | Investigate, contain, remediate | security@vpnet.consulting |
| **DevOps Lead** | System access, deployment, rollback | devops@vpnet.consulting |
| **Legal Counsel** | Regulatory compliance, liability | legal@vpnet.consulting |
| **PR/Comms** | External communication, customer notification | pr@vpnet.consulting |
| **Data Protection Officer** | GDPR compliance, DPA notification | dpo@vpnet.consulting |

### On-Call Rotation

- **Primary:** Security Engineer (24/7)
- **Secondary:** DevOps Lead (24/7)
- **Escalation:** CISO (business hours + critical alerts)

### Communication Channels

- **War Room:** Slack #incident-response
- **Video Call:** Zoom (link in Slack channel description)
- **Email:** incident-response@vpnet.consulting
- **Phone:** PagerDuty alert system

---

## Response Procedures

### Phase 1: Detection & Triage (0-15 minutes)

#### 1. Alert Reception

Incidents may be detected via:
- Prometheus alerting (security metrics)
- Kubernetes pod crash loops
- Customer reports
- Security scanner findings
- Log anomaly detection

#### 2. Initial Assessment

**On-call engineer actions:**

```bash
# Check Prometheus for security alerts
kubectl port-forward -n intent-platform svc/prometheus-service 9090:9090
# Open: http://localhost:9090/alerts

# Check application logs
kubectl logs -n intent-platform -l app=business-intent-agent --tail=1000 | grep -i "error\|warn\|critical"

# Check authentication failures
curl -s http://localhost:9090/api/v1/query?query=auth_failure_total | jq

# Check prompt injection attempts
curl -s http://localhost:9090/api/v1/query?query=prompt_injection_detections_total | jq
```

#### 3. Classification

Determine severity level using the table above.

#### 4. Escalation

If **CRITICAL** or **HIGH**:
- Page Incident Commander (CISO)
- Start war room in Slack
- Initiate Zoom call

If **MEDIUM** or **LOW**:
- Create incident ticket
- Notify Security Lead
- Proceed with investigation

### Phase 2: Containment (15 min - 2 hours)

#### Immediate Actions

**For authentication bypass:**
```bash
# Revoke compromised API key
kubectl exec -n intent-platform deployment/business-intent-agent -- \
  node -e "require('./dist/auth').revokeApiKey('COMPROMISED_KEY')"

# Force authentication re-validation
kubectl rollout restart deployment/business-intent-agent -n intent-platform
```

**For data breach (PII exposure):**
```bash
# Enable PII_HASH_SALT rotation
kubectl create secret generic business-intent-agent-secrets-new \
  --from-literal=pii-hash-salt="$(openssl rand -base64 32)" \
  -n intent-platform

# Update deployment to use new secret
kubectl patch deployment business-intent-agent -n intent-platform \
  --patch '{"spec":{"template":{"spec":{"containers":[{"name":"app","env":[{"name":"PII_HASH_SALT","valueFrom":{"secretKeyRef":{"name":"business-intent-agent-secrets-new","key":"pii-hash-salt"}}}]}]}}}}'
```

**For prompt injection exploit:**
```bash
# Add new attack pattern
# Edit: src/prompt-injection-detection.ts
# Add pattern to INJECTION_PATTERNS.HIGH

# Rebuild and redeploy
npm run build
docker build -t vpnet/business-intent-agent:1.1.1-hotfix .
kind load docker-image vpnet/business-intent-agent:1.1.1-hotfix
kubectl set image deployment/business-intent-agent -n intent-platform \
  app=vpnet/business-intent-agent:1.1.1-hotfix
```

**For compromised container:**
```bash
# Isolate affected pods
kubectl label pod <pod-name> -n intent-platform quarantine=true

# Update NetworkPolicy to block pod
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: quarantine-policy
  namespace: intent-platform
spec:
  podSelector:
    matchLabels:
      quarantine: "true"
  policyTypes:
  - Ingress
  - Egress
  ingress: []
  egress: []
EOF

# Scale down deployment
kubectl scale deployment business-intent-agent -n intent-platform --replicas=0

# Investigate logs before deletion
kubectl logs <pod-name> -n intent-platform > incident-logs-$(date +%s).log
```

### Phase 3: Investigation (2 hours - 2 days)

#### Evidence Collection

**1. Capture system state:**
```bash
# Export all pod logs
kubectl logs -n intent-platform -l app=business-intent-agent --all-containers \
  > incident-logs-all-$(date +%s).log

# Export Prometheus metrics
curl -s http://localhost:9090/api/v1/query?query=auth_failure_total[24h] \
  > metrics-auth-failures.json

curl -s http://localhost:9090/api/v1/query?query=prompt_injection_detections_total[24h] \
  > metrics-injections.json

# Export Kubernetes events
kubectl get events -n intent-platform --sort-by='.lastTimestamp' \
  > k8s-events-$(date +%s).txt
```

**2. Analyze attack timeline:**
```bash
# Search logs for suspicious activity
grep -i "authentication failed\|injection detected\|pii validation failed" \
  incident-logs-all-*.log | sort

# Identify attack source IP
kubectl logs -n intent-platform -l app=business-intent-agent | \
  grep "ip" | jq -r '.ip' | sort | uniq -c | sort -rn | head -20

# Review access patterns
kubectl logs -n intent-platform -l app=business-intent-agent | \
  grep "customerId" | jq -r '.customerId' | sort | uniq -c | sort -rn
```

**3. Determine root cause:**
- Configuration error?
- Vulnerability in code?
- Compromised credentials?
- Zero-day exploit?
- Social engineering?

#### Forensic Analysis

Preserve evidence:
```bash
# Save pod yaml
kubectl get pod <pod-name> -n intent-platform -o yaml > pod-forensics.yaml

# Export container filesystem (if needed)
kubectl cp intent-platform/<pod-name>:/app ./forensics/app-$(date +%s)

# Preserve container image
docker save vpnet/business-intent-agent:1.1.0 | gzip > image-forensics.tar.gz
```

### Phase 4: Eradication (1-7 days)

#### Remove Threat

**Patch vulnerability:**
```bash
# Apply security fix
cd src
git checkout -b security/CVE-YYYY-XXXXX
# ... make code changes ...
git commit -m "Security fix: [description]"
git push origin security/CVE-YYYY-XXXXX

# Create PR, review, merge
# Deploy to production
```

**Rotate all credentials:**
```bash
# Generate new API keys
curl -X POST http://localhost:8080/api/v1/admin/generate-api-key \
  -H 'X-Admin-Secret: NEW_ADMIN_SECRET' \
  -H 'Content-Type: application/json' \
  -d '{"customerId": "CUST-12345", "name": "Rotated Key"}'

# Update PII hash salt
kubectl create secret generic business-intent-agent-secrets \
  --from-literal=pii-hash-salt="$(openssl rand -base64 32)" \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart services
kubectl rollout restart deployment/business-intent-agent -n intent-platform
```

**Verify remediation:**
```bash
# Run security scan
npm audit
trivy image vpnet/business-intent-agent:latest

# Test attack vector
# (Attempt to reproduce the attack - should fail)
```

### Phase 5: Recovery (1-24 hours)

#### Restore Normal Operations

```bash
# Scale up deployment
kubectl scale deployment business-intent-agent -n intent-platform --replicas=3

# Verify health
kubectl get pods -n intent-platform
kubectl logs -n intent-platform -l app=business-intent-agent --tail=50

# Test endpoints
curl http://localhost:8080/health
curl http://localhost:8080/ready

# Monitor metrics
# Check Prometheus for error rates, latency
```

#### Validation

- ✅ All services running
- ✅ No security alerts firing
- ✅ Performance within SLA
- ✅ No customer reports of issues

---

## Communication Plan

### Internal Communication

#### War Room Updates (Every 30 minutes during active incident)

Template:
```
**Incident Update #N - [Timestamp]**

Status: [Investigating / Contained / Eradicating / Resolved]
Severity: [P0 / P1 / P2 / P3]

Summary: [What happened]
Impact: [What's affected]
Actions Taken: [Bullet points]
Next Steps: [What's planned]

ETA to Resolution: [Estimate]
```

### External Communication

#### Customer Notification (if applicable)

**Trigger:** Personal data breach with "high risk" to individuals

**Timeline:** Within 72 hours of discovery

**Template:**
```
Subject: Security Notification - Business Intent Agent

Dear [Customer],

We are writing to inform you of a security incident that may have affected your data.

What Happened:
[Brief description]

What Data Was Affected:
[Specific data types]

What We're Doing:
[Remediation steps]

What You Should Do:
[Customer actions, if any]

Contact:
security@vpnet.consulting

We sincerely apologize for any inconvenience.

Vpnet Consulting LLC
```

#### Regulatory Notification

**GDPR Data Protection Authority (DPA):**
- **Trigger:** Breach likely to result in risk to individuals
- **Timeline:** Within 72 hours
- **Method:** DPA online portal
- **Template:** Use GDPR breach notification form

---

## Runbooks

### Common Scenarios

#### Runbook 1: Unauthorized API Access

**Symptoms:**
- Spike in auth_failure_total metric
- Unknown customer IDs in logs
- Unusual geographic access patterns

**Response:**
1. Identify compromised API key (check logs for customerId)
2. Revoke API key immediately
3. Notify affected customer
4. Investigate how key was obtained
5. Rotate admin secret if needed
6. Update access logs review process

#### Runbook 2: Prompt Injection Exploit

**Symptoms:**
- Unusual Claude API responses
- Prompt revealing system instructions
- Extraction of PII data in responses

**Response:**
1. Capture malicious prompt from logs
2. Add pattern to detection library
3. Review all recent requests from same source IP
4. Verify PII masking still effective
5. Deploy updated detection patterns
6. Monitor for similar attempts

#### Runbook 3: PII Data Leak

**Symptoms:**
- PII validation failures in logs
- Customer data in external logs/monitoring
- Anthropic reports PII in API calls

**Response:**
1. **IMMEDIATE:** Stop all processing (scale to 0 replicas)
2. Assess scope: Which customers? What data?
3. Rotate PII_HASH_SALT
4. Fix masking logic bug
5. Test thoroughly in staging
6. Deploy fix to production
7. Notify affected customers within 72 hours
8. File GDPR breach notification if required

#### Runbook 4: Dependency Vulnerability (Critical CVE)

**Symptoms:**
- GitHub Dependabot alert
- npm audit reports critical vulnerability
- Public disclosure of exploit

**Response:**
1. Assess if vulnerability affects us (check usage)
2. Update affected dependency
3. Run npm audit to verify fix
4. Test in staging environment
5. Deploy to production (expedited)
6. Monitor for exploitation attempts
7. Document in security changelog

---

## Post-Incident Review

### Timeline

- Schedule PIR within **5 business days** of incident resolution
- Duration: 60-90 minutes
- Attendees: IRT + stakeholders

### Agenda

1. **Timeline Review** (15 min)
   - What happened, when?
   - Detection → Resolution timeline

2. **Root Cause Analysis** (20 min)
   - Why did it happen?
   - Contributing factors?

3. **Response Evaluation** (15 min)
   - What went well?
   - What went poorly?
   - Communication effectiveness?

4. **Action Items** (20 min)
   - Preventive measures
   - Detection improvements
   - Response process updates
   - Ownership & deadlines

5. **Documentation** (10 min)
   - Update runbooks
   - Share lessons learned
   - Archive incident report

### Report Template

```markdown
# Post-Incident Review: [Incident Name]

**Date:** [Incident Date]
**Severity:** [P0/P1/P2/P3]
**Duration:** [Detection → Resolution]
**Attendees:** [Names]

## Executive Summary
[2-3 sentences describing the incident and impact]

## Timeline
| Time | Event |
|------|-------|
| ... | ... |

## Root Cause
[Detailed analysis]

## Impact
- Customers affected: X
- Data exposed: [types]
- Downtime: X minutes
- Cost: $X

## What Went Well
1. ...
2. ...

## What Went Poorly
1. ...
2. ...

## Action Items
| Action | Owner | Deadline | Status |
|--------|-------|----------|--------|
| ... | ... | ... | ... |

## Lessons Learned
1. ...
2. ...
```

---

## Testing & Drills

### Quarterly Incident Response Drills

- **Tabletop Exercises:** Simulate incidents, discuss response
- **Red Team Exercises:** Authorized penetration testing
- **Disaster Recovery Test:** Full system restoration

### Metrics to Track

- Mean Time to Detect (MTTD)
- Mean Time to Respond (MTTR)
- Mean Time to Resolve (MTTR)
- Incident count by severity
- False positive rate

---

## Appendix

### Emergency Contacts

| Organization | Contact | Phone | Email |
|--------------|---------|-------|-------|
| Anthropic Support | - | - | support@anthropic.com |
| AWS Support | - | +1-XXX | - |
| Irish DPA | - | +353 XXX | info@dataprotection.ie |
| Legal Counsel | - | +1-XXX | legal@vpnet.consulting |

### Useful Commands

```bash
# Quick incident triage
kubectl get pods -n intent-platform --watch
kubectl logs -n intent-platform -l app=business-intent-agent -f
curl http://localhost:9090/alerts

# Emergency shutdown
kubectl scale deployment business-intent-agent -n intent-platform --replicas=0

# Emergency rollback
kubectl rollout undo deployment/business-intent-agent -n intent-platform
```

---

**Document Owner:** CISO
**Review Frequency:** Quarterly
**Next Review:** March 26, 2026
