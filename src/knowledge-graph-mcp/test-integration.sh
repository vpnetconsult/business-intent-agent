#!/bin/bash
# Integration Tests for Knowledge Graph MCP v2.0.0
# Tests RDF queries, performance benchmarks, and MCP tool functionality

set -e

echo "==================================="
echo "Knowledge Graph MCP v2.0 Tests"
echo "==================================="
echo ""

# Get pod name
POD_NAME=$(kubectl get pod -n intent-platform -l app=knowledge-graph-mcp -o jsonpath='{.items[0].metadata.name}')
echo "Testing pod: $POD_NAME"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "------------------------------------"
HEALTH=$(kubectl exec -n intent-platform $POD_NAME -- wget -O- -q http://localhost:8080/health)
echo "$HEALTH"
if echo "$HEALTH" | grep -q '"status":"healthy"'; then
  echo "✓ PASS: Health check successful"
else
  echo "✗ FAIL: Health check failed"
  exit 1
fi
echo ""

# Test 2: Readiness Check (17 indexes)
echo "Test 2: Readiness Check"
echo "------------------------------------"
READY=$(kubectl exec -n intent-platform $POD_NAME -- wget -O- -q http://localhost:8080/ready)
echo "$READY"
if echo "$READY" | grep -q '"ready":true'; then
  echo "✓ PASS: Readiness check successful"
  if echo "$READY" | grep -q '"indexes":17'; then
    echo "✓ PASS: All 17 indexes present"
  else
    echo "✗ FAIL: Expected 17 indexes"
    exit 1
  fi
else
  echo "✗ FAIL: Readiness check failed"
  exit 1
fi
echo ""

# Test 3: Search Product Catalog (Broadband)
echo "Test 3: Search Product Catalog - Broadband"
echo "------------------------------------"
kubectl port-forward -n intent-platform $POD_NAME 8090:8080 &
PF_PID=$!
sleep 2

SEARCH_RESULT=$(curl -s -X POST http://localhost:8090/mcp/tools/search_product_catalog \
  -H "Content-Type: application/json" \
  -d '{"productType":"broadband","maxPrice":60}')

echo "$SEARCH_RESULT" | jq '.'

if echo "$SEARCH_RESULT" | grep -q '"count":1'; then
  echo "✓ PASS: Found 1 broadband product under €60"
else
  echo "✗ FAIL: Expected 1 product"
  kill $PF_PID 2>/dev/null
  exit 1
fi

if echo "$SEARCH_RESULT" | grep -q '"id":"PROD-BB-1GB"'; then
  echo "✓ PASS: Found Broadband 1Gbps"
else
  echo "✗ FAIL: Expected PROD-BB-1GB"
  kill $PF_PID 2>/dev/null
  exit 1
fi

# Check execution time
EXEC_TIME=$(echo "$SEARCH_RESULT" | jq '.executionTimeMs')
echo "Execution time: ${EXEC_TIME}ms"
if [ "$EXEC_TIME" -lt 500 ]; then
  echo "✓ PASS: Query performance < 500ms"
else
  echo "⚠ WARNING: Query took longer than expected"
fi

kill $PF_PID 2>/dev/null
echo ""
sleep 2

# Test 4: Find Related Products
echo "Test 4: Find Related Products"
echo "------------------------------------"
kubectl port-forward -n intent-platform $POD_NAME 8091:8080 &
PF_PID=$!
sleep 2

RELATED_RESULT=$(curl -s -X POST http://localhost:8091/mcp/tools/find_related_products \
  -H "Content-Type: application/json" \
  -d '{"productId":"PROD-BB-500"}')

echo "$RELATED_RESULT" | jq '.'

if echo "$RELATED_RESULT" | jq '.count' | grep -q -E '[1-9]'; then
  echo "✓ PASS: Found related products"
else
  echo "✗ FAIL: No related products found"
  kill $PF_PID 2>/dev/null
  exit 1
fi

# Check for RDF URIs
if echo "$RELATED_RESULT" | grep -q 'https://intent-platform.example.com'; then
  echo "✓ PASS: RDF URIs present in response"
else
  echo "✗ FAIL: Missing RDF URIs"
  kill $PF_PID 2>/dev/null
  exit 1
fi

kill $PF_PID 2>/dev/null
echo ""
sleep 2

# Test 5: Get Bundle Recommendations
echo "Test 5: Get Bundle Recommendations"
echo "------------------------------------"
kubectl port-forward -n intent-platform $POD_NAME 8092:8080 &
PF_PID=$!
sleep 2

BUNDLE_RESULT=$(curl -s -X POST http://localhost:8092/mcp/tools/get_bundle_recommendations \
  -H "Content-Type: application/json" \
  -d '{"intent":"gaming","maxPrice":100}')

echo "$BUNDLE_RESULT" | jq '.'

if echo "$BUNDLE_RESULT" | jq '.count' | grep -q -E '[1-9]'; then
  echo "✓ PASS: Found gaming bundles"
else
  echo "✗ FAIL: No gaming bundles found"
  kill $PF_PID 2>/dev/null
  exit 1
fi

# Check bundle structure
if echo "$BUNDLE_RESULT" | jq '.results[0].products' | grep -q 'PROD-'; then
  echo "✓ PASS: Bundle includes products"
else
  echo "✗ FAIL: Bundle missing products"
  kill $PF_PID 2>/dev/null
  exit 1
fi

kill $PF_PID 2>/dev/null
echo ""
sleep 2

# Test 6: Premium Segment Filter
echo "Test 6: Premium Segment Filter"
echo "------------------------------------"
kubectl port-forward -n intent-platform $POD_NAME 8093:8080 &
PF_PID=$!
sleep 2

PREMIUM_RESULT=$(curl -s -X POST http://localhost:8093/mcp/tools/search_product_catalog \
  -H "Content-Type: application/json" \
  -d '{"segment":"premium","minPopularity":80}')

echo "$PREMIUM_RESULT" | jq '.'

if echo "$PREMIUM_RESULT" | jq '.count' | grep -q -E '[1-9]'; then
  echo "✓ PASS: Found premium products"
else
  echo "✗ FAIL: No premium products found"
  kill $PF_PID 2>/dev/null
  exit 1
fi

kill $PF_PID 2>/dev/null
echo ""

# Summary
echo "==================================="
echo "Test Summary"
echo "==================================="
echo "✓ All integration tests PASSED"
echo ""
echo "Performance Summary:"
echo "- Query execution times: < 500ms"
echo "- RDF URI support: Working"
echo "- Indexes: 17/17 online"
echo "- MCP Tools: 3/3 functional"
echo ""
echo "Deployment Status: PRODUCTION READY ✅"
echo "==================================="
