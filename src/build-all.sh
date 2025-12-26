#!/bin/bash
set -e

echo "Building all microservices..."

# Business Intent Agent
echo "Building Business Intent Agent..."
cd ai-agents/business-intent-agent
docker build -t vpnet/business-intent-agent:1.0.0 .
cd ../..

echo ""
echo "All services built successfully!"
echo ""
echo "Built images:"
docker images | grep vpnet
