# Istio Service Mesh Configuration

This directory contains Istio service mesh configurations for the Business Intent Agent platform.

## Architecture

### Services in Mesh
- **business-intent-agent** (2 replicas) - Main API service
- **bss-oss-mcp-service** (1 replica) - BSS/OSS data services
- **customer-data-mcp-service** (1 replica) - Customer profile retrieval
- **knowledge-graph-mcp-service** (1 replica) - Product bundle recommendations

### Features
- **Security:** mTLS STRICT mode between all services
- **Ingress:** NodePort gateway for local development
- **Observability:** Kiali, Jaeger, Prometheus, Grafana
- **Traffic Management:** Retries, timeouts, circuit breakers

## Prerequisites

- Kubernetes cluster (Docker Desktop, Minikube, or kind)
- kubectl configured
- Minimum resources: 4 CPU cores, 8GB RAM
- istioctl installed (v1.20+)

## Installation

### 1. Install istioctl

```bash
# Download and install istioctl
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.20.1
export PATH=$PWD/bin:$PATH

# Verify installation
istioctl version
```

### 2. Install Istio with Demo Profile

```bash
# Install Istio (includes control plane + observability stack)
istioctl install --set profile=demo -y

# Verify installation
kubectl get pods -n istio-system

# Expected output: istiod, ingress-gateway, egress-gateway, kiali, jaeger, prometheus, grafana
```

### 3. Patch Gateway to NodePort (for local development)

```bash
# Change istio-ingressgateway from LoadBalancer to NodePort
kubectl patch svc istio-ingressgateway -n istio-system -p '{"spec":{"type":"NodePort"}}'

# Verify NodePort assignment
kubectl get svc istio-ingressgateway -n istio-system
```

### 4. Enable Sidecar Injection

```bash
# Label namespace for automatic sidecar injection
kubectl label namespace intent-platform istio-injection=enabled

# Verify label
kubectl get namespace intent-platform --show-labels
```

### 5. Deploy Istio Resources

```bash
# Apply all Istio configurations
kubectl apply -f business-intent-agent/k8s/istio/

# Verify resources created
kubectl get gateway -n intent-platform
kubectl get virtualservices -n intent-platform
kubectl get destinationrules -n intent-platform
kubectl get peerauthentication -n intent-platform
kubectl get serviceentry -n intent-platform
kubectl get telemetry -n intent-platform
```

### 6. Restart Pods to Inject Sidecars

```bash
# Rolling restart all deployments
kubectl rollout restart deployment/business-intent-agent -n intent-platform
kubectl rollout restart deployment/bss-oss-mcp -n intent-platform
kubectl rollout restart deployment/customer-data-mcp -n intent-platform
kubectl rollout restart deployment/knowledge-graph-mcp -n intent-platform

# Watch the rollout
kubectl rollout status deployment/business-intent-agent -n intent-platform

# Verify sidecars are injected (should show 2/2 containers)
kubectl get pods -n intent-platform
```

## Verification

### Check Mesh Status

```bash
# Check proxy status (should show SYNCED for all services)
istioctl proxy-status

# Analyze configuration (should show no issues)
istioctl analyze -n intent-platform

# Verify mTLS is enabled
POD_NAME=$(kubectl get pod -n intent-platform -l app=business-intent-agent -o jsonpath='{.items[0].metadata.name}')
istioctl authn tls-check $POD_NAME.intent-platform
```

### Test Ingress Gateway

```bash
# Get the NodePort
export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
export INGRESS_HOST=localhost  # or 'minikube ip' for Minikube

echo "Gateway URL: http://$INGRESS_HOST:$INGRESS_PORT"

# Test health endpoint
curl http://$INGRESS_HOST:$INGRESS_PORT/health

# Test TMF921 API
curl -X GET http://$INGRESS_HOST:$INGRESS_PORT/tmf-api/intentManagement/v5/intent \
  -H "X-API-Key: dev-api-key-12345"

# Expected: 200 OK response
```

## Observability Dashboards

### Kiali (Service Graph)

```bash
# Port-forward Kiali
kubectl port-forward svc/kiali -n istio-system 20001:20001

# Open in browser
open http://localhost:20001

# Default credentials: admin/admin
```

**What to Check:**
- Graph view showing all services and traffic flow
- Verify mTLS lock icons on connections
- Check traffic rates and error rates
- View distributed traces

### Jaeger (Distributed Tracing)

```bash
# Port-forward Jaeger
kubectl port-forward svc/jaeger-query -n istio-system 16686:16686

# Open in browser
open http://localhost:16686
```

**What to Check:**
- Select "business-intent-agent" service
- View traces showing full request path through MCP services
- Check latencies at each hop
- Identify slow operations

### Prometheus (Metrics)

```bash
# Port-forward Prometheus
kubectl port-forward svc/prometheus -n istio-system 9090:9090

# Open in browser
open http://localhost:9090
```

**Example Queries:**
```promql
# Request rate
rate(istio_requests_total{destination_service_name="business-intent-agent-service"}[5m])

# Error rate
rate(istio_requests_total{destination_service_name="business-intent-agent-service",response_code=~"5.."}[5m])

# P95 latency
histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service_name))
```

### Grafana (Dashboards)

```bash
# Port-forward Grafana
kubectl port-forward svc/grafana -n istio-system 3000:3000

# Open in browser
open http://localhost:3000
```

**Pre-built Istio Dashboards:**
- Istio Mesh Dashboard
- Istio Service Dashboard
- Istio Workload Dashboard
- Istio Performance Dashboard

## Configuration Files

| File | Purpose |
|------|---------|
| `00-gateway.yaml` | Ingress gateway configuration (HTTP/HTTPS) |
| `01-virtualservice-business-intent-agent.yaml` | Main API routing with 30s timeout |
| `02-virtualservice-bss-oss-mcp.yaml` | BSS/OSS MCP routing with 10s timeout |
| `03-virtualservice-customer-data-mcp.yaml` | Customer Data MCP routing with 10s timeout |
| `04-virtualservice-knowledge-graph-mcp.yaml` | Knowledge Graph MCP routing with 10s timeout |
| `05-destinationrule-business-intent-agent.yaml` | LEAST_REQUEST LB, connection pools, circuit breakers |
| `06-destinationrule-bss-oss-mcp.yaml` | ROUND_ROBIN LB, connection limits |
| `07-destinationrule-customer-data-mcp.yaml` | ROUND_ROBIN LB, connection limits |
| `08-destinationrule-knowledge-graph-mcp.yaml` | ROUND_ROBIN LB, connection limits |
| `09-peerauthentication.yaml` | mTLS STRICT mode configuration |
| `10-serviceentry-anthropic.yaml` | External Anthropic API access with retry policies |
| `11-telemetry.yaml` | Jaeger tracing (100% sampling) + Prometheus metrics |

## Traffic Management

### Timeouts
- **Business Intent Agent:** 30s (handles long AI requests)
- **MCP Services:** 10s (matches MCP_TIMEOUT_MS)
- **Anthropic API:** 120s (complex AI operations)

### Retries
- **All services:** 3 attempts (matches MCP_RETRY_ATTEMPTS)
- **Retry conditions:** 5xx, reset, connect-failure, refused-stream

### Circuit Breakers
- **Business Intent Agent:** 100 max connections, 5 consecutive errors
- **MCP Services:** 50 max connections, 3 consecutive errors
- Outlier detection ejects unhealthy instances

### Load Balancing
- **Business Intent Agent:** LEAST_REQUEST (better for variable AI latency)
- **MCP Services:** ROUND_ROBIN (simple and efficient)

## Troubleshooting

### Services not accessible through gateway

```bash
# Check gateway configuration
kubectl get gateway -n intent-platform intent-platform-gateway -o yaml

# Check VirtualService routing
kubectl get virtualservice -n intent-platform business-intent-agent-vs -o yaml

# Check Envoy logs
kubectl logs -n istio-system deploy/istio-ingressgateway --tail=50

# Test gateway connectivity
kubectl exec -it deploy/istio-ingressgateway -n istio-system -- curl -v http://business-intent-agent-service.intent-platform:8080/health
```

### mTLS connection failures

```bash
# Check authentication policy
kubectl get peerauthentication -n intent-platform -o yaml

# Verify certificates
istioctl proxy-config secret deployment/business-intent-agent -n intent-platform

# Check for mixed mTLS modes
istioctl authn tls-check $POD_NAME.intent-platform

# Temporarily switch to PERMISSIVE for debugging
kubectl patch peerauthentication intent-platform-mtls -n intent-platform --type merge -p '{"spec":{"mtls":{"mode":"PERMISSIVE"}}}'
```

### Pods stuck in Init state

```bash
# Check init container logs
kubectl logs -n intent-platform <pod-name> -c istio-init

# Check for CNI conflicts
kubectl describe pod -n intent-platform <pod-name>
```

### High latency issues

```bash
# Check Envoy stats
kubectl exec deployment/business-intent-agent -n intent-platform -c istio-proxy -- \
  curl localhost:15000/stats/prometheus | grep -E 'http_downstream_rq_time|upstream_rq_time'

# Review circuit breaker stats
kubectl exec deployment/business-intent-agent -n intent-platform -c istio-proxy -- \
  curl localhost:15000/stats/prometheus | grep pending_overflow

# View traces in Jaeger to identify bottlenecks
kubectl port-forward -n istio-system svc/jaeger-query 16686:16686
```

### External API (Anthropic) not reachable

```bash
# Verify ServiceEntry
kubectl get serviceentry -n intent-platform anthropic-api -o yaml

# Test from pod
kubectl exec -it deployment/business-intent-agent -n intent-platform -c business-intent-agent -- \
  curl -v https://api.anthropic.com/v1/messages

# Enable debug logging on proxy
istioctl proxy-config log deployment/business-intent-agent.intent-platform --level=debug
```

## Gradual Rollout Strategy

For production or risk-averse deployments, use a gradual rollout:

### Phase 1: Install with PERMISSIVE mTLS

1. Edit `09-peerauthentication.yaml` and change to PERMISSIVE:
```yaml
spec:
  mtls:
    mode: PERMISSIVE  # Allows both mTLS and plain text
```

2. Follow installation steps 1-6 above

### Phase 2: Verify Services

```bash
# Check all services are working
kubectl get pods -n intent-platform
kubectl logs -n intent-platform -l app=business-intent-agent --tail=50

# Test API endpoints
export INGRESS_PORT=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.spec.ports[?(@.name=="http2")].nodePort}')
curl http://localhost:$INGRESS_PORT/health
```

### Phase 3: Switch to STRICT mTLS

```bash
# Edit 09-peerauthentication.yaml back to STRICT
kubectl apply -f business-intent-agent/k8s/istio/09-peerauthentication.yaml

# Verify mTLS is enforced
istioctl authn tls-check <pod-name>.intent-platform
```

## Rollback

### Quick Rollback (Remove Sidecars)

```bash
# Remove namespace label
kubectl label namespace intent-platform istio-injection-

# Rollback deployments (removes sidecars)
kubectl rollout undo deployment/business-intent-agent -n intent-platform
kubectl rollout undo deployment/bss-oss-mcp -n intent-platform
kubectl rollout undo deployment/customer-data-mcp -n intent-platform
kubectl rollout undo deployment/knowledge-graph-mcp -n intent-platform
```

### Full Rollback (Remove Istio Resources)

```bash
# Delete Istio configurations
kubectl delete -f business-intent-agent/k8s/istio/

# Remove namespace label
kubectl label namespace intent-platform istio-injection-

# Restart pods to remove sidecars
kubectl rollout restart deployment -n intent-platform
```

### Complete Uninstall (Remove Istio)

```bash
# Uninstall Istio
istioctl uninstall --purge -y

# Delete Istio namespace
kubectl delete namespace istio-system
```

## Resource Requirements

### Control Plane (istio-system namespace)
- **CPU:** ~1.5 cores
- **Memory:** ~7GB
- **Services:** istiod, ingress-gateway, egress-gateway, Kiali, Jaeger, Prometheus, Grafana

### Data Plane (intent-platform namespace)
- **CPU:** ~100m per sidecar × 5 pods = ~500m
- **Memory:** ~128Mi per sidecar × 5 pods = ~640Mi

### Total Overhead
- **Additional CPU:** ~2 cores
- **Additional Memory:** ~8GB

### Recommended Cluster Size
- **Minimum:** 4 CPU cores, 8GB RAM (tight but functional)
- **Recommended:** 8 CPU cores, 16GB RAM

## Performance Considerations

### Latency Impact
- **Per-hop latency:** +1-3ms (sidecar processing)
- **mTLS overhead:** +0.5-1ms per connection
- **Total impact:** ~2-5ms per request

### Mitigation Strategies
- Connection pooling (configured in DestinationRules)
- HTTP/2 multiplexing (enabled by default)
- Keep-alive connections (default behavior)
- LEAST_REQUEST load balancing for AI workload

## Additional Resources

- [Istio Documentation](https://istio.io/latest/docs/)
- [Istio Best Practices](https://istio.io/latest/docs/ops/best-practices/)
- [Troubleshooting Guide](https://istio.io/latest/docs/ops/common-problems/)
- [Traffic Management](https://istio.io/latest/docs/concepts/traffic-management/)
- [Security](https://istio.io/latest/docs/concepts/security/)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Istio logs: `kubectl logs -n istio-system deployment/istiod`
3. Analyze configuration: `istioctl analyze -n intent-platform`
4. Check proxy status: `istioctl proxy-status`
