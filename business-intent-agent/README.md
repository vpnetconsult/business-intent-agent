# Business Intent Agent - Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the Business Intent Agent to your local Kubernetes cluster.

## Overview

**Component**: Business Intent Agent
**Runtime**: Node.js 20
**AI Model**: Claude Sonnet 4 (Anthropic)
**Deployment Target**: Local Kubernetes (Docker Desktop, Minikube, k3s, etc.)

## Prerequisites

### 1. Local Kubernetes Cluster

You need a running local Kubernetes cluster. Options:

- **Docker Desktop**: Enable Kubernetes in Settings → Kubernetes → Enable Kubernetes
- **Minikube**: `minikube start`
- **k3s/k3d**: Lightweight Kubernetes
- **Kind**: Kubernetes in Docker

Verify your cluster is running:
```bash
kubectl cluster-info
kubectl get nodes
```

### 2. Required Tools

```bash
# kubectl (Kubernetes CLI)
kubectl version --client

# Optional: helm (if you want to use Helm charts)
helm version
```

### 3. Anthropic API Key

Get your API key from [Anthropic Console](https://console.anthropic.com/)

You'll need to add this to `k8s/01-secrets.yaml` before deploying.

## Quick Start

### 1. Configure Secrets

Edit `k8s/01-secrets.yaml` and replace `YOUR_ANTHROPIC_API_KEY_HERE` with your actual Anthropic API key:

```yaml
stringData:
  anthropic-api-key: "sk-ant-api03-your-actual-key-here"
```

**Important**: Update the MCP server URLs if you have them running locally:
```yaml
  mcp-bss-url: "http://your-mcp-server:8080"
  mcp-knowledge-graph-url: "http://your-knowledge-graph:8080"
  mcp-customer-data-url: "http://your-customer-data:8080"
```

### 2. Build or Pull Docker Image

You need to have the Business Intent Agent Docker image available. Options:

**Option A: Build locally** (if you have the source code)
```bash
cd /path/to/business-intent-agent-source
docker build -t vpnet/business-intent-agent:1.0.0 .
```

**Option B: Pull from registry**
```bash
docker pull vpnet/business-intent-agent:1.0.0
```

**Option C: Update the image reference**

Edit `k8s/04-deployment.yaml` and change the image:
```yaml
image: your-registry/your-image:tag
# or for local builds:
image: business-intent-agent:1.0.0
```

### 3. Deploy

Use the automated deployment script:

```bash
chmod +x deploy.sh
./deploy.sh
```

Or deploy manually:

```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-secrets.yaml
kubectl apply -f k8s/02-configmap.yaml
kubectl apply -f k8s/03-rbac.yaml
kubectl apply -f k8s/04-deployment.yaml
kubectl apply -f k8s/05-service.yaml
kubectl apply -f k8s/06-hpa.yaml
```

### 4. Verify Deployment

```bash
# Check deployment status
kubectl get deployment business-intent-agent -n intent-platform

# Check pods
kubectl get pods -n intent-platform -l app=business-intent-agent

# Check service
kubectl get svc -n intent-platform

# View logs
kubectl logs -f -n intent-platform -l app=business-intent-agent
```

### 5. Access the Service

**Port forward to your local machine:**

```bash
kubectl port-forward -n intent-platform svc/business-intent-agent-service 8080:8080
```

Now the service is available at `http://localhost:8080`

## Testing

### Health Check

```bash
curl http://localhost:8080/health
```

Expected response:
```json
{"status":"healthy","timestamp":"2025-12-26T14:30:00.000Z"}
```

### Readiness Check

```bash
curl http://localhost:8080/ready
```

### Test Intent Processing

```bash
curl -X POST http://localhost:8080/api/v1/intent \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST-12345",
    "intent": "I need reliable internet for working from home"
  }'
```

Expected response:
```json
{
  "intent_analysis": {
    "tags": ["work_from_home", "reliability", "internet"],
    "product_types": ["broadband", "mobile"]
  },
  "recommended_offer": {
    "name": "Work-from-Home Bundle",
    "products": ["Broadband 500Mbps", "Mobile 50GB"],
    "price": "€49.99/month"
  },
  "quote": {
    "quote_id": "QTE-67890",
    "total_monthly": 49.99,
    "currency": "EUR"
  },
  "processing_time_ms": 2345
}
```

## Configuration

### Resource Limits

The deployment is configured for local development with reduced resource requirements:

- **CPU Request**: 250m (0.25 cores)
- **CPU Limit**: 1000m (1 core)
- **Memory Request**: 512Mi
- **Memory Limit**: 2Gi

To adjust resources, edit `k8s/04-deployment.yaml`:

```yaml
resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 2Gi
```

### Scaling

**Horizontal Pod Autoscaler (HPA)** is configured to scale between 2-5 replicas based on:
- CPU utilization > 70%
- Memory utilization > 80%

To disable autoscaling:
```bash
kubectl delete hpa business-intent-agent-hpa -n intent-platform
```

To manually scale:
```bash
kubectl scale deployment business-intent-agent --replicas=3 -n intent-platform
```

### Environment Variables

Application configuration is managed via ConfigMap (`k8s/02-configmap.yaml`):

- `CLAUDE_MODEL`: AI model to use
- `CLAUDE_MAX_TOKENS`: Maximum tokens per request
- `LOG_LEVEL`: Logging verbosity
- `MCP_TIMEOUT_MS`: MCP server timeout

## Manifest Files

```
k8s/
├── 00-namespace.yaml         # Creates 'intent-platform' namespace
├── 01-secrets.yaml           # API keys and MCP URLs (EDIT THIS!)
├── 02-configmap.yaml         # Application configuration
├── 03-rbac.yaml              # ServiceAccount, Role, RoleBinding
├── 04-deployment.yaml        # Main application deployment
├── 05-service.yaml           # ClusterIP service
└── 06-hpa.yaml               # Horizontal Pod Autoscaler
```

## Troubleshooting

### Pods Not Starting

Check pod status:
```bash
kubectl describe pod -n intent-platform -l app=business-intent-agent
kubectl logs -n intent-platform -l app=business-intent-agent
```

Common issues:
- **ImagePullBackOff**: Image not available locally or in registry
- **CrashLoopBackOff**: Application error (check logs)
- **Pending**: Insufficient resources

### Service Not Accessible

```bash
# Check if pods are ready
kubectl get pods -n intent-platform -l app=business-intent-agent

# Check service endpoints
kubectl get endpoints business-intent-agent-service -n intent-platform

# Test from within cluster
kubectl run test-pod --rm -it --image=curlimages/curl -- sh
curl http://business-intent-agent-service.intent-platform.svc.cluster.local:8080/health
```

### High Memory Usage

```bash
# Check resource usage
kubectl top pods -n intent-platform -l app=business-intent-agent

# Increase memory limit if needed
# Edit k8s/04-deployment.yaml and increase memory limit
kubectl apply -f k8s/04-deployment.yaml
```

### Viewing Events

```bash
# Recent events in namespace
kubectl get events -n intent-platform --sort-by='.lastTimestamp'

# Watch events in real-time
kubectl get events -n intent-platform --watch
```

## Undeployment

### Using the script

```bash
chmod +x undeploy.sh
./undeploy.sh
```

### Manual removal

```bash
# Remove all resources
kubectl delete -f k8s/

# Or remove specific resources
kubectl delete deployment business-intent-agent -n intent-platform
kubectl delete svc business-intent-agent-service -n intent-platform

# Remove namespace (removes everything)
kubectl delete namespace intent-platform
```

## Security Notes

⚠️ **Important for Production**:

1. **Secrets Management**: For production, use:
   - HashiCorp Vault
   - AWS Secrets Manager
   - Sealed Secrets
   - External Secrets Operator

2. **Image Security**:
   - Scan images for vulnerabilities
   - Use specific version tags (not `latest`)
   - Store in private registry

3. **Network Policies**:
   - Add network policies to restrict traffic
   - Use service mesh (Istio, Linkerd) for mTLS

4. **RBAC**:
   - Follow principle of least privilege
   - Review service account permissions

## Monitoring

### View Metrics

If metrics-server is installed:
```bash
kubectl top pods -n intent-platform
kubectl top nodes
```

### Prometheus Integration

The deployment includes Prometheus annotations:
```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8080"
  prometheus.io/path: "/metrics"
```

Prometheus will automatically discover and scrape metrics if configured.

## Next Steps

1. **Implement Application Code**: Create the actual Node.js application
2. **Setup MCP Servers**: Deploy required MCP servers
3. **Add Monitoring**: Setup Prometheus + Grafana
4. **Implement CI/CD**: Automate builds and deployments
5. **Configure Ingress**: Expose service externally via Ingress controller

## Support

For issues or questions:
- Check logs: `kubectl logs -n intent-platform -l app=business-intent-agent`
- Describe resources: `kubectl describe -n intent-platform <resource-type> <name>`
- View events: `kubectl get events -n intent-platform`

## License

[Your License Here]
