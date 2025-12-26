#!/bin/bash
# undeploy.sh
# Remove Business Intent Agent from Kubernetes

set -e

NAMESPACE="intent-platform"
MANIFEST_DIR="k8s"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "Business Intent Agent - Undeployment"
echo "========================================="
echo ""

read -p "Are you sure you want to remove all resources? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo "Removing all resources..."
echo ""

# Delete in reverse order
kubectl delete -f "$MANIFEST_DIR/06-hpa.yaml" --ignore-not-found=true
echo -e "${GREEN}✓${NC} HPA removed"

kubectl delete -f "$MANIFEST_DIR/05-service.yaml" --ignore-not-found=true
echo -e "${GREEN}✓${NC} Service removed"

kubectl delete -f "$MANIFEST_DIR/04-deployment.yaml" --ignore-not-found=true
echo -e "${GREEN}✓${NC} Deployment removed"

kubectl delete -f "$MANIFEST_DIR/03-rbac.yaml" --ignore-not-found=true
echo -e "${GREEN}✓${NC} RBAC resources removed"

kubectl delete -f "$MANIFEST_DIR/02-configmap.yaml" --ignore-not-found=true
echo -e "${GREEN}✓${NC} ConfigMap removed"

kubectl delete -f "$MANIFEST_DIR/01-secrets.yaml" --ignore-not-found=true
echo -e "${GREEN}✓${NC} Secrets removed"

read -p "Do you want to delete the namespace '$NAMESPACE'? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    kubectl delete -f "$MANIFEST_DIR/00-namespace.yaml" --ignore-not-found=true
    echo -e "${GREEN}✓${NC} Namespace removed"
else
    echo -e "${YELLOW}⊘${NC} Namespace kept"
fi

echo ""
echo -e "${GREEN}Undeployment complete!${NC}"
