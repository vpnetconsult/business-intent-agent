# Rollback Guide - v1.1.0 to v1.0.0

**Created:** December 26, 2025
**Purpose:** Emergency rollback procedures for v1.1.0 security release

---

## Quick Rollback (Emergency)

If v1.1.0 causes critical issues, rollback immediately:

```bash
# 1. Rollback to v1.0.0 code
git checkout v1.0.0

# 2. Rebuild Docker image
cd src
docker build -t vpnet/business-intent-agent:1.0.0 -f Dockerfile.build .

# 3. Load to Kind
kind load docker-image vpnet/business-intent-agent:1.0.0 --name local-k8s

# 4. Rollback Kubernetes deployment
kubectl set image deployment/business-intent-agent \
  -n intent-platform \
  app=vpnet/business-intent-agent:1.0.0

# 5. Verify rollback
kubectl rollout status deployment/business-intent-agent -n intent-platform
kubectl get pods -n intent-platform
```

---

## Detailed Rollback Procedures

### Option 1: Git Revert (Preserves History)

**Use when:** You want to keep audit trail of changes

```bash
# Revert the security commit
git revert 32bb11e

# Delete the v1.1.0 tag locally
git tag -d v1.1.0

# Push changes
git push origin main

# Delete remote tag
git push origin :refs/tags/v1.1.0
```

### Option 2: Git Reset (Clean Rollback)

**Use when:** You want to completely remove v1.1.0 from history

⚠️ **WARNING:** This rewrites history. Only use if v1.1.0 hasn't been deployed to production.

```bash
# Reset to v1.0.0 commit
git reset --hard 66aec84

# Delete tag
git tag -d v1.1.0

# Force push (DANGEROUS)
git push origin main --force
git push origin :refs/tags/v1.1.0
```

### Option 3: Checkout Specific Version (Temporary)

**Use when:** You want to test v1.0.0 without changing git history

```bash
# Checkout v1.0.0 tag
git checkout v1.0.0

# You're now in "detached HEAD" state
# Deploy and test...

# To return to latest
git checkout main
```

---

## Kubernetes Rollback

### Method 1: Rollout Undo

```bash
# Undo last deployment
kubectl rollout undo deployment/business-intent-agent -n intent-platform

# Verify
kubectl rollout status deployment/business-intent-agent -n intent-platform
```

### Method 2: Specific Revision

```bash
# View deployment history
kubectl rollout history deployment/business-intent-agent -n intent-platform

# Rollback to specific revision (e.g., revision 1 = v1.0.0)
kubectl rollout undo deployment/business-intent-agent \
  -n intent-platform \
  --to-revision=1

# Verify
kubectl get pods -n intent-platform -o wide
```

### Method 3: Apply v1.0.0 Manifests

```bash
# Checkout v1.0.0
git checkout v1.0.0

# Reapply old manifests
cd business-intent-agent
./deploy.sh

# Verify
kubectl get all -n intent-platform
```

---

## Docker Compose Rollback

### Issue: v1.1.0 Uses Docker Secrets

If you rollback to v1.0.0, docker-compose.yml won't work because it expects secrets files.

**Solution 1: Restore v1.0.0 docker-compose.yml**

```bash
# Checkout old docker-compose.yml
git checkout v1.0.0 -- src/docker-compose.yml

# Start services (with hardcoded passwords - v1.0.0 behavior)
cd src
docker-compose up -d
```

**Solution 2: Keep v1.1.0 docker-compose.yml + Use Secrets**

```bash
# Keep the secure version, just deploy v1.0.0 application code
cd src

# Generate secrets (if not already done)
./setup-secrets.sh

# Deploy with secrets (v1.1.0 docker-compose)
docker-compose up -d
```

---

## Post-Rollback Verification

### 1. Check Application Health

```bash
# Port-forward
kubectl port-forward -n intent-platform svc/business-intent-agent-service 8080:8080

# Test health endpoint (v1.0.0 doesn't require authentication)
curl http://localhost:8080/health

# Expected response:
# {"status":"healthy","service":"business-intent-agent","version":"1.0.0"}
```

### 2. Test Intent Processing

```bash
# v1.0.0 - No authentication required
curl -X POST http://localhost:8080/api/v1/intent \
  -H 'Content-Type: application/json' \
  -d '{
    "customerId": "CUST-12345",
    "intent": "I need faster internet"
  }'

# Should succeed without Bearer token
```

### 3. Check Logs

```bash
kubectl logs -n intent-platform -l app=business-intent-agent --tail=100
```

### 4. Monitor Metrics

```bash
# Port-forward Prometheus
kubectl port-forward -n intent-platform svc/prometheus-service 9090:9090

# Check metrics at: http://localhost:9090
```

---

## Known Issues After Rollback

### Issue 1: Missing v1.1.0 Security Features

After rollback to v1.0.0:
- ❌ No API authentication (anyone can call API)
- ❌ No PII masking (customer data sent to Claude AI)
- ❌ No prompt injection detection
- ❌ Hardcoded credentials in docker-compose.yml
- ❌ No security metrics

**Impact:** High security risk. Rollback should be temporary only.

### Issue 2: Kubernetes Secrets Not Used

v1.0.0 doesn't use the new Kubernetes secrets (DEFAULT_API_KEY, PII_HASH_SALT).

**Solution:** This is fine. v1.0.0 manifests don't reference these secrets.

### Issue 3: Docker Secrets Files Remain

The `src/secrets/*.txt` files will still exist after rollback.

**Solution:** Keep them. They don't affect v1.0.0 operation.

---

## Rollback Decision Matrix

| Scenario | Recommended Action | Risk |
|----------|-------------------|------|
| **API authentication causing 401 errors** | Fix auth config, don't rollback | LOW |
| **PII masking breaking AI responses** | Disable masking temporarily, fix logic | MEDIUM |
| **Prompt injection blocking legitimate requests** | Adjust detection thresholds | LOW |
| **Complete system failure** | Full rollback to v1.0.0 | HIGH |
| **Data breach suspected** | **DO NOT ROLLBACK** - Investigate | CRITICAL |

---

## Emergency Contacts

If rollback is needed:

| Role | Contact | Availability |
|------|---------|--------------|
| **DevOps Lead** | devops@vpnet.cloud | 24/7 |
| **Security Engineer** | security@vpnet.cloud | 24/7 |
| **CISO** | ciso@vpnet.cloud | Business hours + critical |
| **CTO** | cto@vpnet.cloud | Business hours + critical |

---

## Rollback Testing (Before Emergency)

**Recommended:** Test rollback procedure in staging before production deployment.

```bash
# 1. Deploy v1.1.0 to staging
kubectl apply -f business-intent-agent/k8s/ -n staging

# 2. Test v1.1.0 functionality
# ... run tests ...

# 3. Perform rollback
kubectl rollout undo deployment/business-intent-agent -n staging

# 4. Verify v1.0.0 functionality restored
curl http://staging:8080/health

# 5. Document any issues encountered
```

---

## Re-deployment After Rollback

If you rolled back and fixed the issue, to re-deploy v1.1.0:

```bash
# 1. Ensure on main branch with v1.1.0 code
git checkout main
git pull origin main

# 2. Verify you have v1.1.0
git log --oneline | head -1
# Should show: 32bb11e Security: NIST CSF 2.0 Phase 1 implementation

# 3. Rebuild Docker image
cd src
docker build -t vpnet/business-intent-agent:1.1.0 -f Dockerfile.build .

# 4. Load to Kind
kind load docker-image vpnet/business-intent-agent:1.1.0 --name local-k8s

# 5. Deploy
cd ../business-intent-agent
kubectl set image deployment/business-intent-agent \
  -n intent-platform \
  app=vpnet/business-intent-agent:1.1.0

# 6. Verify
kubectl rollout status deployment/business-intent-agent -n intent-platform
```

---

## Version History

| Version | Commit | Tag | Date | Status |
|---------|--------|-----|------|--------|
| **v1.1.0** | 32bb11e | v1.1.0 | Dec 26, 2025 | CURRENT |
| **v1.0.0** | 66aec84 | v1.0.0 | Dec 26, 2025 | ROLLBACK POINT |

---

## Appendix: Full Rollback Checklist

- [ ] 1. Notify stakeholders (CISO, CTO)
- [ ] 2. Document reason for rollback
- [ ] 3. Checkout v1.0.0 tag (`git checkout v1.0.0`)
- [ ] 4. Rebuild Docker image (version 1.0.0)
- [ ] 5. Load image to Kind cluster
- [ ] 6. Rollback Kubernetes deployment
- [ ] 7. Verify pods are running
- [ ] 8. Test health endpoint
- [ ] 9. Test intent processing (without auth)
- [ ] 10. Check application logs
- [ ] 11. Monitor Prometheus metrics
- [ ] 12. Monitor for errors (30 minutes)
- [ ] 13. Notify customers if downtime occurred
- [ ] 14. Create incident report
- [ ] 15. Schedule post-mortem meeting
- [ ] 16. Fix v1.1.0 issues
- [ ] 17. Test fix in staging
- [ ] 18. Re-deploy v1.1.0 when ready

---

**Document Owner:** DevOps Lead
**Last Updated:** December 26, 2025
**Next Review:** After v1.1.0 production deployment
