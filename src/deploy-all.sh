#!/bin/bash
set -e

NAMESPACE=${1:-intent-platform}
ENVIRONMENT=${2:-development}

echo "Deploying all services to Kubernetes..."
echo "Namespace: $NAMESPACE"
echo "Environment: $ENVIRONMENT"

# Create namespace
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply manifests
kubectl apply -f kubernetes/namespaces/
kubectl apply -f kubernetes/configmaps/
kubectl apply -f kubernetes/deployments/
kubectl apply -f kubernetes/services/
kubectl apply -f kubernetes/hpa/

# Wait for deployments
kubectl rollout status deployment/business-intent-agent -n $NAMESPACE --timeout=5m

echo ""
echo "Deployment complete!"
kubectl get pods -n $NAMESPACE
