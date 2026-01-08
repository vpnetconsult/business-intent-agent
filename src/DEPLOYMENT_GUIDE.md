# Business Intent Agent - Deployment Guide

## TMF921 v1.1.0 Release Deployment

This guide covers deploying the TMF921-enabled Business Intent Agent v1.1.0-tmf921.

## What's New in v1.1.0-tmf921

### TMF921 Intent Management API v5.0.0
- **Full Core Compliance** with TMF Forum TMF921 specification
- Standards-compliant intent-based automation for telecommunications
- RESTful API endpoints at `/tmf-api/intentManagement/v5`

### Features
- ✅ Complete intent lifecycle management (acknowledged → inProgress → completed)
- ✅ All TMF921 v5.0.0 required fields (lifecycleStatus, lastUpdate, validFor, etc.)
- ✅ Intent expectations and specifications
- ✅ Intent reporting and tracking
- ✅ Generic metadata via characteristics
- ✅ Semantic expressions (JSON-LD, Turtle)
- ✅ Intent relationships and bundling
- ✅ Query parameters (lifecycleStatus, intentType, limit, offset)
- ✅ Mass assignment protection
- ✅ Customer ownership verification
- ✅ GDPR compliance maintained

### Security Updates
- MCP SDK: 1.25.1 → 1.25.2 (fixes ReDoS vulnerability)
- qs: 6.14.0 → 6.14.1 (fixes DoS vulnerability)
- Dockerfile improvements for subdirectory support

## Docker Images

### Available Images

```bash
# Latest version
docker pull vpnet/business-intent-agent:latest

# Specific TMF921 version
docker pull vpnet/business-intent-agent:1.1.0-tmf921
```

### Image Details
- **Registry:** Docker Hub (docker.io/vpnet)
- **Latest Tag:** `vpnet/business-intent-agent:latest`
- **Version Tag:** `vpnet/business-intent-agent:1.1.0-tmf921`
- **Image Size:** ~282MB
- **Base Image:** node:22-alpine
- **Digest:** sha256:29afe6611e6e20c8c4157de81f0196aff07670b9f951486b84886a1a2b84da5d

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured with cluster access
- Namespace: `intent-platform`
- Required secrets:
  - `anthropic-api-key`
  - `mcp-api-keys`
- ConfigMap: `shared-config`

### Quick Deployment

```bash
# 1. Create namespace (if not exists)
kubectl create namespace intent-platform --dry-run=client -o yaml | kubectl apply -f -

# 2. Apply deployment
kubectl apply -f business-intent-agent.yaml

# 3. Wait for rollout
kubectl rollout status deployment/business-intent-agent -n intent-platform --timeout=5m

# 4. Verify pods are running
kubectl get pods -n intent-platform -l app=business-intent-agent

# 5. Check logs
kubectl logs -n intent-platform -l app=business-intent-agent --tail=100 -f
```

### Deployment Configuration

The deployment manifest (`business-intent-agent.yaml`) includes:

**Replicas:** 3 (for high availability)

**Resources:**
- Requests: 1 CPU, 2Gi memory
- Limits: 2 CPU, 4Gi memory

**Probes:**
- Liveness: `/health` endpoint
- Readiness: `/ready` endpoint

**Environment Variables:**
- MCP service URLs (BSS/OSS, Knowledge Graph, Customer Data)
- Anthropic API key from file mount
- Shared configuration from ConfigMap

### Rolling Update

To update to the new version:

```bash
# Update the image (already done in business-intent-agent.yaml)
kubectl set image deployment/business-intent-agent \
  business-intent-agent=vpnet/business-intent-agent:1.1.0-tmf921 \
  -n intent-platform

# Monitor the rollout
kubectl rollout status deployment/business-intent-agent -n intent-platform

# Verify new pods are running
kubectl get pods -n intent-platform -l app=business-intent-agent -o wide
```

### Rollback (if needed)

```bash
# Check rollout history
kubectl rollout history deployment/business-intent-agent -n intent-platform

# Rollback to previous version
kubectl rollout undo deployment/business-intent-agent -n intent-platform

# Rollback to specific revision
kubectl rollout undo deployment/business-intent-agent -n intent-platform --to-revision=2
```

## Local Testing with Docker

### Run Locally

```bash
# Pull the image
docker pull vpnet/business-intent-agent:1.1.0-tmf921

# Run with environment variables
docker run -p 8080:8080 \
  -e ANTHROPIC_API_KEY=your-api-key \
  -e MCP_BSS_URL=http://localhost:8081 \
  -e MCP_KNOWLEDGE_GRAPH_URL=http://localhost:8082 \
  -e MCP_CUSTOMER_DATA_URL=http://localhost:8083 \
  vpnet/business-intent-agent:1.1.0-tmf921
```

### Test TMF921 Endpoints

```bash
# Health check
curl http://localhost:8080/health

# Create intent
curl -X POST http://localhost:8080/tmf-api/intentManagement/v5/intent \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "name": "Test intent",
    "description": "Testing TMF921 API",
    "intentType": "CustomerIntent"
  }'

# List intents
curl http://localhost:8080/tmf-api/intentManagement/v5/intent \
  -H "X-API-Key: your-api-key"
```

## Verification & Testing

### 1. Verify Deployment Health

```bash
# Check deployment status
kubectl get deployment business-intent-agent -n intent-platform

# Check pod status
kubectl get pods -n intent-platform -l app=business-intent-agent

# Check service
kubectl get svc business-intent-agent-service -n intent-platform

# Check endpoints
kubectl get endpoints business-intent-agent-service -n intent-platform
```

### 2. Verify TMF921 API

```bash
# Port-forward to local machine
kubectl port-forward -n intent-platform \
  svc/business-intent-agent-service 8080:8080

# In another terminal, test TMF921 endpoints
curl http://localhost:8080/tmf-api/intentManagement/v5/intent \
  -H "X-API-Key: your-api-key"
```

### 3. Run Comprehensive Tests

Use the comprehensive test scenarios in `TMF921_TEST_SCENARIO.md`:

```bash
# Set environment variables
export API_BASE_URL="http://localhost:8080"
export API_KEY="your-api-key"

# Run test scenarios from TMF921_TEST_SCENARIO.md
# See: TMF921_TEST_SCENARIO.md for complete test suite
```

### 4. Monitor Logs

```bash
# Follow logs from all pods
kubectl logs -n intent-platform -l app=business-intent-agent -f --all-containers

# Check for TMF921 API activity
kubectl logs -n intent-platform -l app=business-intent-agent | grep "TMF921"

# Check for errors
kubectl logs -n intent-platform -l app=business-intent-agent | grep -i error
```

## Troubleshooting

### Pods Not Starting

```bash
# Describe pod for events
kubectl describe pod -n intent-platform -l app=business-intent-agent

# Check pod logs
kubectl logs -n intent-platform -l app=business-intent-agent --previous

# Check secrets are mounted
kubectl exec -n intent-platform -it <pod-name> -- ls -la /run/secrets/
```

### TMF921 API Not Responding

```bash
# Check if service is accessible
kubectl exec -n intent-platform -it <pod-name> -- \
  curl http://localhost:8080/health

# Test TMF921 endpoint from within pod
kubectl exec -n intent-platform -it <pod-name> -- \
  curl http://localhost:8080/tmf-api/intentManagement/v5/intent \
  -H "X-API-Key: test"

# Check application logs
kubectl logs -n intent-platform <pod-name> | tail -100
```

### High Memory Usage

```bash
# Check resource usage
kubectl top pods -n intent-platform -l app=business-intent-agent

# Adjust resource limits if needed
kubectl edit deployment business-intent-agent -n intent-platform
```

## Monitoring & Observability

### Prometheus Metrics

The application exposes Prometheus metrics at `/metrics`:

```bash
# Port-forward and check metrics
kubectl port-forward -n intent-platform svc/business-intent-agent-service 8080:8080
curl http://localhost:8080/metrics
```

**Key Metrics:**
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request duration
- `tmf921_intent_created_total` - TMF921 intents created
- `tmf921_intent_processing_duration_seconds` - Intent processing time

### Application Logs

Logs are structured JSON format (via Pino):

```json
{
  "level": 30,
  "time": 1704729600000,
  "msg": "TMF921 Intent created via API",
  "intentId": "550e8400-e29b-41d4-a716-446655440000",
  "customerId": "CUST123"
}
```

## Performance Considerations

### Scaling

```bash
# Scale deployment
kubectl scale deployment business-intent-agent -n intent-platform --replicas=5

# Enable HPA (if configured)
kubectl autoscale deployment business-intent-agent -n intent-platform \
  --cpu-percent=70 --min=3 --max=10
```

### Performance Tuning

**Current Configuration:**
- 3 replicas for load distribution
- 1 CPU / 2Gi memory per pod (requests)
- 2 CPU / 4Gi memory per pod (limits)

**For High Load:**
- Increase replicas to 5-10
- Increase memory limits to 6-8Gi
- Add HPA for auto-scaling
- Consider caching layer (Redis)

## Security Considerations

### API Key Management

```bash
# Create API key secret (if not exists)
kubectl create secret generic mcp-api-keys \
  -n intent-platform \
  --from-literal=MCP_API_KEY_BUSINESS_INTENT=your-secure-key

# Rotate Anthropic API key
kubectl delete secret anthropic-api-key -n intent-platform
kubectl create secret generic anthropic-api-key \
  -n intent-platform \
  --from-file=key=./anthropic_api_key.txt
kubectl rollout restart deployment/business-intent-agent -n intent-platform
```

### Network Policies

Ensure network policies allow:
- Ingress: From API gateway/ingress controller on port 8080
- Egress: To MCP services (BSS/OSS, Knowledge Graph, Customer Data)
- Egress: To Anthropic API (api.anthropic.com)

### RBAC

Verify ServiceAccount has required permissions:

```bash
kubectl describe serviceaccount business-intent-agent -n intent-platform
kubectl get rolebindings -n intent-platform
```

## Migration from v1.0.0

### Breaking Changes

**None** - v1.1.0 is backward compatible with v1.0.0:
- Legacy `/api/v1/intent` endpoint still supported
- TMF921 API is additive (new endpoints at `/tmf-api/intentManagement/v5`)
- Existing clients continue to work without changes

### Migration Path

1. **Deploy v1.1.0** alongside v1.0.0 (rolling update)
2. **Test TMF921 endpoints** with new clients
3. **Gradually migrate** clients to TMF921 API
4. **Monitor** both API versions
5. **Deprecate** legacy API in future release (v2.0.0)

## Disaster Recovery

### Backup

```bash
# Backup deployment configuration
kubectl get deployment business-intent-agent -n intent-platform -o yaml > backup-deployment.yaml

# Backup secrets (encrypted)
kubectl get secrets -n intent-platform -o yaml > backup-secrets.yaml
```

### Restore

```bash
# Restore deployment
kubectl apply -f backup-deployment.yaml

# Restore secrets
kubectl apply -f backup-secrets.yaml

# Verify restoration
kubectl rollout status deployment/business-intent-agent -n intent-platform
```

## Support & Documentation

- **TMF921 API Documentation:** `TMF921_README.md`
- **Test Scenarios:** `TMF921_TEST_SCENARIO.md`
- **Specification Review:** `TMF921_SPEC_REVIEW.md`
- **Security Documentation:** `SECURITY.md`
- **GitHub Repository:** https://github.com/vpnetconsult/business-intent-agent

## Release Notes

### v1.1.0-tmf921 (January 8, 2026)

**Features:**
- ✅ TMF921 Intent Management API v5.0.0 (Full Core Compliance)
- ✅ Complete intent lifecycle management
- ✅ Intent reporting and tracking
- ✅ All TMF921 v5.0.0 required fields
- ✅ Query parameter support
- ✅ Mass assignment protection

**Security:**
- 🔒 Fixed ReDoS vulnerability (MCP SDK 1.25.2)
- 🔒 Fixed DoS vulnerability (qs 6.14.1)
- 🔒 Dockerfile security improvements

**Compatibility:**
- ✅ Backward compatible with v1.0.0
- ✅ Legacy API still supported
- ✅ No breaking changes

**Testing:**
- 📋 Comprehensive test scenarios (6 scenarios, 20+ tests)
- ⚡ Load testing (100 concurrent requests)
- ✅ Full TMF921 compliance validation

---

**Deployment Date:** January 8, 2026
**Version:** v1.1.0-tmf921
**Status:** Production Ready
**Compliance:** TMF921 v5.0.0 Full Core Compliance
