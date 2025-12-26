#!/bin/bash
# deploy.sh
# Deployment automation script for Business Intent Agent on local Kubernetes

set -e

NAMESPACE="intent-platform"
MANIFEST_DIR="k8s"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Business Intent Agent - Deployment"
echo "========================================="
echo ""

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Check if kubectl can connect to cluster
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Cannot connect to Kubernetes cluster${NC}"
    echo "Make sure your local Kubernetes is running (Docker Desktop, Minikube, etc.)"
    exit 1
fi

echo -e "${GREEN}✓${NC} Connected to Kubernetes cluster"
echo ""

# Check if secrets are configured
if grep -q "YOUR_ANTHROPIC_API_KEY_HERE" "$MANIFEST_DIR/01-secrets.yaml"; then
    echo -e "${YELLOW}Warning: Anthropic API key not configured!${NC}"
    echo "Please edit $MANIFEST_DIR/01-secrets.yaml and add your API key"
    echo ""
    read -p "Do you want to continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 1: Create namespace
echo "Step 1: Creating namespace '$NAMESPACE'..."
kubectl apply -f "$MANIFEST_DIR/00-namespace.yaml"
echo -e "${GREEN}✓${NC} Namespace created"
echo ""

# Step 2: Apply secrets
echo "Step 2: Creating secrets..."
kubectl apply -f "$MANIFEST_DIR/01-secrets.yaml"
echo -e "${GREEN}✓${NC} Secrets created"
echo ""

# Step 3: Apply ConfigMap
echo "Step 3: Creating ConfigMap..."
kubectl apply -f "$MANIFEST_DIR/02-configmap.yaml"
echo -e "${GREEN}✓${NC} ConfigMap created"
echo ""

# Step 4: Apply RBAC
echo "Step 4: Creating RBAC resources..."
kubectl apply -f "$MANIFEST_DIR/03-rbac.yaml"
echo -e "${GREEN}✓${NC} RBAC resources created"
echo ""

# Step 5: Apply Deployment
echo "Step 5: Creating Deployment..."
kubectl apply -f "$MANIFEST_DIR/04-deployment.yaml"
echo -e "${GREEN}✓${NC} Deployment created"
echo ""

# Step 6: Apply Service
echo "Step 6: Creating Service..."
kubectl apply -f "$MANIFEST_DIR/05-service.yaml"
echo -e "${GREEN}✓${NC} Service created"
echo ""

# Step 7: Apply HPA
echo "Step 7: Creating HorizontalPodAutoscaler..."
kubectl apply -f "$MANIFEST_DIR/06-hpa.yaml"
echo -e "${GREEN}✓${NC} HPA created"
echo ""

# Wait for deployment to be ready
echo "Waiting for deployment to be ready..."
kubectl rollout status deployment/business-intent-agent -n $NAMESPACE --timeout=5m

echo ""
echo "========================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "========================================="
echo ""

# Show deployment status
echo "Deployment Status:"
kubectl get deployment business-intent-agent -n $NAMESPACE

echo ""
echo "Pods:"
kubectl get pods -n $NAMESPACE -l app=business-intent-agent

echo ""
echo "Service:"
kubectl get svc business-intent-agent-service -n $NAMESPACE

echo ""
echo "========================================="
echo "Next Steps:"
echo "========================================="
echo ""
echo "1. Port forward to access the service:"
echo "   kubectl port-forward -n $NAMESPACE svc/business-intent-agent-service 8080:8080"
echo ""
echo "2. Test health endpoint:"
echo "   curl http://localhost:8080/health"
echo ""
echo "3. Test intent processing:"
echo "   curl -X POST http://localhost:8080/api/v1/intent \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"customerId\": \"CUST-12345\", \"intent\": \"I need internet for work from home\"}'"
echo ""
echo "4. View logs:"
echo "   kubectl logs -f -n $NAMESPACE -l app=business-intent-agent"
echo ""
