# Business Intent Agent - Kubernetes Deployment

AI-powered business intent processing system using Claude AI and microservices architecture on Kubernetes.

## 🚀 Quick Start

### Prerequisites

- Kubernetes cluster (Docker Desktop, Kind, Minikube, etc.)
- kubectl configured
- Docker installed
- Anthropic API key
- **Optional:** istioctl (for Istio service mesh features)

### Security Setup (Required)

⚠️ **IMPORTANT:** As of v1.1.0, hardcoded credentials have been removed for NIST CSF 2.0 compliance.

```bash
# Run automated secrets setup
cd src
./setup-secrets.sh
```

This generates secure random passwords for PostgreSQL, Neo4j, and Grafana. See [src/SECURITY_SETUP.md](src/SECURITY_SETUP.md) for details.

### Deployment

```bash
# 1. Build Docker images
cd src
docker build -t vpnet/business-intent-agent:1.0.0 -f Dockerfile.build .

cd mcp-services/customer-data
docker build -t vpnet/customer-data-mcp-service:1.0.0 .

cd ../bss-oss
docker build -t vpnet/bss-oss-mcp-service:1.0.0 .

cd ../knowledge-graph
docker build -t vpnet/knowledge-graph-mcp-service:1.0.0 .

# 2. Load images to Kind (if using Kind)
kind load docker-image vpnet/business-intent-agent:1.0.0 --name local-k8s
kind load docker-image vpnet/customer-data-mcp-service:1.0.0 --name local-k8s
kind load docker-image vpnet/bss-oss-mcp-service:1.0.0 --name local-k8s
kind load docker-image vpnet/knowledge-graph-mcp-service:1.0.0 --name local-k8s

# 3. Configure secrets
# Edit business-intent-agent/k8s/01-secrets.yaml
# Add your Anthropic API key

# 4. Deploy business intent agent
cd business-intent-agent
./deploy.sh

# 5. Deploy MCP services
kubectl apply -f ../mcp-services-k8s/customer-data-mcp.yaml
kubectl apply -f ../mcp-services-k8s/bss-oss-mcp.yaml
kubectl apply -f ../mcp-services-k8s/knowledge-graph-mcp.yaml

# 6. Deploy Neo4j (optional)
kubectl apply -f ../mcp-services-k8s/neo4j.yaml

# Wait for Neo4j to be ready
kubectl wait --for=condition=ready pod -l app=neo4j -n intent-platform --timeout=120s

# Populate Neo4j
kubectl cp ../src/populate-neo4j.cypher intent-platform/$(kubectl get pod -n intent-platform -l app=neo4j -o jsonpath='{.items[0].metadata.name}'):/tmp/populate.cypher
kubectl exec -n intent-platform deployment/neo4j -- cypher-shell -u neo4j -p password123 -f /tmp/populate.cypher

# 7. Deploy Istio Service Mesh (optional but recommended)
# See business-intent-agent/k8s/istio/README.md for complete setup guide
istioctl install --set profile=demo -y
kubectl label namespace intent-platform istio-injection=enabled
kubectl apply -f business-intent-agent/k8s/istio/
kubectl rollout restart deployment -n intent-platform
```

## 🔌 Access Services

### Port Forwarding

```bash
# Business Intent Agent
kubectl port-forward -n intent-platform svc/business-intent-agent-service 8080:8080

# Neo4j Browser
kubectl port-forward -n intent-platform svc/neo4j-service 7474:7474 7687:7687

# With Istio Service Mesh:
# Kiali (Service Mesh Dashboard)
kubectl port-forward svc/kiali -n istio-system 20001:20001

# Jaeger (Distributed Tracing)
kubectl port-forward svc/tracing -n istio-system 16686:80

# Prometheus (Metrics)
kubectl port-forward svc/prometheus -n istio-system 9090:9090

# Grafana (Dashboards)
kubectl port-forward svc/grafana -n istio-system 3000:3000
```

### Test Intent Processing

```bash
curl -X POST http://localhost:8080/api/v1/intent \
  -H 'Content-Type: application/json' \
  -d '{"customerId": "CUST-12345", "intent": "I need internet for work from home"}'
```

### Access Neo4j Browser

Open http://localhost:7474 in your browser
- Username: `neo4j`
- Password: `password123`

## 📊 Architecture

See [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) for detailed architecture and deployment information.

## 🛠️ Development

### Project Structure

```
k8s/
├── business-intent-agent/     # Main application & K8s manifests
├── mcp-services-k8s/          # MCP services K8s manifests
├── src/                       # Source code
│   ├── *.ts                   # TypeScript application files
│   └── mcp-services/          # MCP service implementations
├── DEPLOYMENT_SUMMARY.md      # Detailed deployment documentation
└── README.md                  # This file
```

### Key Technologies

- **AI/ML:** Claude AI (Anthropic Sonnet 4.5)
- **Backend:** Node.js 20, TypeScript, Express
- **Database:** Neo4j 5 (Graph Database)
- **Protocol:** MCP (Model Context Protocol)
- **Container:** Docker, Kubernetes
- **Service Mesh:** Istio (mTLS, observability, traffic management)
- **Monitoring:** Prometheus, Grafana, Kiali, Jaeger

## 📚 Documentation

- [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) - Complete deployment guide and architecture
- [business-intent-agent/README.md](business-intent-agent/README.md) - Business intent agent details
- [business-intent-agent/k8s/istio/README.md](business-intent-agent/k8s/istio/README.md) - Istio service mesh setup guide
- [src/SETUP_GUIDE.md](src/SETUP_GUIDE.md) - Manual setup instructions
- [CHANGELOG.md](CHANGELOG.md) - Version history and release notes

## 🔧 Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n intent-platform
```

### View Logs
```bash
kubectl logs -n intent-platform -l app=business-intent-agent -f
```

### Common Issues

See [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md#troubleshooting) for detailed troubleshooting guide.

## 📝 License

PROPRIETARY - Vpnet Consulting LLC

## 👥 Authors

Vpnet Consulting LLC

---

**Status:** ✅ Operational with Istio Service Mesh
**Version:** 1.4.0
**Last Updated:** January 10, 2026
