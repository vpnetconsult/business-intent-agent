# TMF921 Intent Management API - Test Scenario

This document provides comprehensive test scenarios to validate TMF921 v5.0.0 compliance.

## Prerequisites

- Business Intent Agent running on port 8080
- Valid API key configured
- curl or similar HTTP client installed

## Environment Setup

```bash
# Set environment variables
export API_BASE_URL="http://localhost:8080"
export API_KEY="your-api-key-here"
export CUSTOMER_ID="CUST123"

# Verify API is running
curl -X GET "$API_BASE_URL/health"
```

## Test Scenario 1: Complete Intent Lifecycle

### 1.1 Create Intent (POST /tmf-api/intentManagement/v5/intent)

**Test:** Create a new customer intent for high-speed internet upgrade

```bash
curl -X POST "$API_BASE_URL/tmf-api/intentManagement/v5/intent" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "High-speed internet upgrade",
    "description": "I need faster internet for working from home",
    "intentType": "CustomerIntent",
    "priority": 7,
    "validFor": {
      "startDateTime": "2026-01-01T00:00:00Z",
      "endDateTime": "2026-12-31T23:59:59Z"
    },
    "context": "work-from-home",
    "version": "1.0",
    "intentExpectation": [
      {
        "name": "bandwidth",
        "expectationType": "minimum",
        "expectationTarget": [
          {
            "targetValue": "1000Mbps",
            "targetValueType": "bandwidth"
          }
        ]
      }
    ],
    "characteristic": [
      {
        "name": "urgency",
        "value": "high",
        "valueType": "string"
      },
      {
        "name": "budget",
        "value": "flexible",
        "valueType": "string"
      }
    ]
  }'
```

**Expected Response:**
- Status Code: `201 Created`
- Headers: `Location: /tmf-api/intentManagement/v5/intent/{id}`
- Body contains:
  - `id`: UUID
  - `href`: Full intent URL
  - `lifecycleStatus`: "acknowledged"
  - `creationDate`: ISO 8601 timestamp
  - `statusChangeDate`: ISO 8601 timestamp
  - All submitted fields preserved

**Validation Checklist:**
- ✓ Intent created with unique ID
- ✓ Initial lifecycle status is "acknowledged"
- ✓ Location header points to created intent
- ✓ relatedParty includes authenticated customer
- ✓ Timestamps are valid ISO 8601 format
- ✓ All TMF921 v5.0.0 required fields present

### 1.2 Retrieve Intent (GET /tmf-api/intentManagement/v5/intent/{id})

**Test:** Retrieve the created intent by ID

```bash
# Save intent ID from previous response
INTENT_ID="550e8400-e29b-41d4-a716-446655440000"

curl -X GET "$API_BASE_URL/tmf-api/intentManagement/v5/intent/$INTENT_ID" \
  -H "X-API-Key: $API_KEY"
```

**Expected Response:**
- Status Code: `200 OK`
- Body contains complete intent with:
  - Current `lifecycleStatus` (acknowledged, inProgress, or completed)
  - `intentReport` array (may be empty or contain processing updates)
  - All original intent fields

**Validation Checklist:**
- ✓ Intent retrieved successfully
- ✓ Lifecycle status has progressed (inProgress or completed)
- ✓ Intent reports contain processing updates
- ✓ Customer ownership verified

### 1.3 List Intents (GET /tmf-api/intentManagement/v5/intent)

**Test:** List all intents for authenticated customer

```bash
curl -X GET "$API_BASE_URL/tmf-api/intentManagement/v5/intent" \
  -H "X-API-Key: $API_KEY"
```

**With Filters:**

```bash
# Filter by lifecycle status
curl -X GET "$API_BASE_URL/tmf-api/intentManagement/v5/intent?lifecycleStatus=completed" \
  -H "X-API-Key: $API_KEY"

# Filter by intent type
curl -X GET "$API_BASE_URL/tmf-api/intentManagement/v5/intent?intentType=CustomerIntent" \
  -H "X-API-Key: $API_KEY"

# Pagination
curl -X GET "$API_BASE_URL/tmf-api/intentManagement/v5/intent?limit=10&offset=0" \
  -H "X-API-Key: $API_KEY"

# Combined filters
curl -X GET "$API_BASE_URL/tmf-api/intentManagement/v5/intent?lifecycleStatus=completed&intentType=CustomerIntent&limit=5" \
  -H "X-API-Key: $API_KEY"
```

**Expected Response:**
- Status Code: `200 OK`
- Body: Array of intent objects
- Only intents owned by authenticated customer returned

**Validation Checklist:**
- ✓ Array of intents returned
- ✓ Filters applied correctly
- ✓ Pagination works (limit/offset)
- ✓ Only customer's own intents visible

### 1.4 Update Intent (PATCH /tmf-api/intentManagement/v5/intent/{id})

**Test:** Update intent with new requirements

```bash
curl -X PATCH "$API_BASE_URL/tmf-api/intentManagement/v5/intent/$INTENT_ID" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "description": "Updated requirements: need 2000Mbps for video conferencing",
    "priority": 9,
    "intentExpectation": [
      {
        "name": "bandwidth",
        "expectationType": "minimum",
        "expectationTarget": [
          {
            "targetValue": "2000Mbps",
            "targetValueType": "bandwidth"
          }
        ]
      }
    ]
  }'
```

**Expected Response:**
- Status Code: `200 OK`
- Body: Updated intent object
- `lastUpdate` timestamp refreshed

**Validation Checklist:**
- ✓ Intent updated successfully
- ✓ lastUpdate timestamp changed
- ✓ Only whitelisted fields accepted
- ✓ Mass assignment protection working

### 1.5 Delete Intent (DELETE /tmf-api/intentManagement/v5/intent/{id})

**Test:** Cancel and delete intent

```bash
curl -X DELETE "$API_BASE_URL/tmf-api/intentManagement/v5/intent/$INTENT_ID" \
  -H "X-API-Key: $API_KEY"
```

**Expected Response:**
- Status Code: `204 No Content`
- Empty body

**Validation:**

```bash
# Verify intent is deleted
curl -X GET "$API_BASE_URL/tmf-api/intentManagement/v5/intent/$INTENT_ID" \
  -H "X-API-Key: $API_KEY"

# Expected: 404 Not Found
```

**Validation Checklist:**
- ✓ Intent deleted successfully
- ✓ Intent marked as "cancelled" before deletion
- ✓ Subsequent GET returns 404

## Test Scenario 2: TMF921 Field Validation

### 2.1 TimePeriod Validation

**Test:** Create intent with validity period

```bash
curl -X POST "$API_BASE_URL/tmf-api/intentManagement/v5/intent" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "6-month mobile plan",
    "description": "Temporary mobile service for project",
    "validFor": {
      "startDateTime": "2026-01-01T00:00:00Z",
      "endDateTime": "2026-06-30T23:59:59Z"
    }
  }'
```

**Validation:**
- ✓ validFor.startDateTime accepted
- ✓ validFor.endDateTime accepted
- ✓ TimePeriod structure preserved

### 2.2 Characteristic Metadata

**Test:** Add generic metadata via characteristics

```bash
curl -X POST "$API_BASE_URL/tmf-api/intentManagement/v5/intent" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "IoT connectivity",
    "description": "Smart home device connectivity",
    "characteristic": [
      {
        "name": "device_count",
        "value": 25,
        "valueType": "integer"
      },
      {
        "name": "protocol",
        "value": "MQTT",
        "valueType": "string"
      },
      {
        "name": "encryption",
        "value": true,
        "valueType": "boolean"
      }
    ]
  }'
```

**Validation:**
- ✓ Multiple characteristics supported
- ✓ Different value types (string, integer, boolean)
- ✓ Characteristics preserved and retrievable

### 2.3 Intent Expression (Semantic)

**Test:** Create intent with semantic expression

```bash
curl -X POST "$API_BASE_URL/tmf-api/intentManagement/v5/intent" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "Enterprise SLA intent",
    "description": "99.99% uptime SLA requirement",
    "expression": {
      "iri": "urn:tmf:intent:sla:uptime:99.99",
      "@type": "IntentExpression"
    }
  }'
```

**Validation:**
- ✓ IntentExpression field accepted
- ✓ IRI (Internationalized Resource Identifier) supported
- ✓ Expression preserved in response

### 2.4 Intent Relationship

**Test:** Create related intents

```bash
# Create parent intent
curl -X POST "$API_BASE_URL/tmf-api/intentManagement/v5/intent" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "Complete network upgrade",
    "description": "Full network infrastructure upgrade",
    "isBundle": true
  }'

# Save parent intent ID
PARENT_INTENT_ID="parent-intent-uuid"

# Create child intent with relationship
curl -X POST "$API_BASE_URL/tmf-api/intentManagement/v5/intent" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "Router upgrade component",
    "description": "Upgrade network router",
    "intentRelationship": [
      {
        "id": "'"$PARENT_INTENT_ID"'",
        "relationshipType": "childOf",
        "@type": "EntityRelationship"
      }
    ]
  }'
```

**Validation:**
- ✓ isBundle flag supported
- ✓ intentRelationship array accepted
- ✓ Intent hierarchy maintained

## Test Scenario 3: Security & Authorization

### 3.1 Authentication Test

**Test:** Verify API key authentication

```bash
# Without API key - should fail
curl -X GET "$API_BASE_URL/tmf-api/intentManagement/v5/intent" \
  -w "\nStatus: %{http_code}\n"

# Expected: 401 Unauthorized

# With invalid API key - should fail
curl -X GET "$API_BASE_URL/tmf-api/intentManagement/v5/intent" \
  -H "X-API-Key: invalid-key-12345" \
  -w "\nStatus: %{http_code}\n"

# Expected: 401 Unauthorized

# With valid API key - should succeed
curl -X GET "$API_BASE_URL/tmf-api/intentManagement/v5/intent" \
  -H "X-API-Key: $API_KEY" \
  -w "\nStatus: %{http_code}\n"

# Expected: 200 OK
```

**Validation:**
- ✓ Missing API key rejected (401)
- ✓ Invalid API key rejected (401)
- ✓ Valid API key accepted (200)

### 3.2 Customer Ownership Test

**Test:** Verify customers can only access their own intents

```bash
# Create intent as Customer A
curl -X POST "$API_BASE_URL/tmf-api/intentManagement/v5/intent" \
  -H "X-API-Key: $API_KEY_CUSTOMER_A" \
  -d '{"name": "Customer A intent"}' \
  -o /tmp/intent_a.json

INTENT_A_ID=$(jq -r '.id' /tmp/intent_a.json)

# Try to access as Customer B - should fail
curl -X GET "$API_BASE_URL/tmf-api/intentManagement/v5/intent/$INTENT_A_ID" \
  -H "X-API-Key: $API_KEY_CUSTOMER_B" \
  -w "\nStatus: %{http_code}\n"

# Expected: 403 Forbidden
```

**Validation:**
- ✓ Customers cannot access other customers' intents
- ✓ 403 Forbidden returned for unauthorized access
- ✓ relatedParty validation working

### 3.3 Mass Assignment Protection

**Test:** Verify protected fields cannot be set

```bash
# Try to set protected fields - should be filtered
curl -X POST "$API_BASE_URL/tmf-api/intentManagement/v5/intent" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "Test intent",
    "id": "hacker-controlled-id",
    "lifecycleStatus": "completed",
    "creationDate": "2020-01-01T00:00:00Z"
  }'
```

**Expected Response:**
- Status Code: `400 Bad Request` OR fields filtered out
- Violation messages logged

**Validation:**
- ✓ Protected fields (id, creationDate, lifecycleStatus on create) filtered
- ✓ Mass assignment violations logged
- ✓ Only whitelisted fields accepted

## Test Scenario 4: Error Handling

### 4.1 Invalid Request Format

**Test:** Send malformed requests

```bash
# Missing required field
curl -X POST "$API_BASE_URL/tmf-api/intentManagement/v5/intent" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "description": "No name field"
  }'

# Expected: 400 Bad Request
# Error: "name is required"
```

**Validation:**
- ✓ Required field validation working
- ✓ Clear error messages returned
- ✓ HTTP 400 status code

### 4.2 Intent Not Found

**Test:** Access non-existent intent

```bash
curl -X GET "$API_BASE_URL/tmf-api/intentManagement/v5/intent/non-existent-id" \
  -H "X-API-Key: $API_KEY" \
  -w "\nStatus: %{http_code}\n"

# Expected: 404 Not Found
```

**Validation:**
- ✓ 404 status returned
- ✓ Clear error message
- ✓ Intent ID included in error

## Test Scenario 5: Intent Processing & Reporting

### 5.1 Monitor Intent Processing

**Test:** Track intent through lifecycle states

```bash
# Create intent
RESPONSE=$(curl -X POST "$API_BASE_URL/tmf-api/intentManagement/v5/intent" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "name": "5G upgrade request",
    "description": "Upgrade to 5G service with unlimited data"
  }')

INTENT_ID=$(echo $RESPONSE | jq -r '.id')

# Poll for status changes
for i in {1..10}; do
  echo "Poll $i:"
  curl -s "$API_BASE_URL/tmf-api/intentManagement/v5/intent/$INTENT_ID" \
    -H "X-API-Key: $API_KEY" \
    | jq '{lifecycleStatus, statusChangeDate, intentReport: .intentReport | length}'
  sleep 2
done
```

**Expected Lifecycle Progression:**
1. `acknowledged` → Intent created
2. `inProgress` → Processing started
3. `completed` OR `failed` → Processing finished

**Validation:**
- ✓ Lifecycle status progresses correctly
- ✓ statusChangeDate updates on transitions
- ✓ Intent reports added during processing

### 5.2 Intent Report Validation

**Test:** Verify intent reports contain processing results

```bash
# Get completed intent
curl -X GET "$API_BASE_URL/tmf-api/intentManagement/v5/intent/$INTENT_ID" \
  -H "X-API-Key: $API_KEY" \
  | jq '.intentReport[]'
```

**Expected Intent Report Structure:**
```json
{
  "id": "report-uuid",
  "href": "/tmf-api/intentManagement/v5/intent/{intentId}/intentReport/{reportId}",
  "creationDate": "2026-01-08T12:00:00.000Z",
  "reportEntry": [
    {
      "id": "entry-uuid",
      "reportingTimeStamp": "2026-01-08T12:00:00.000Z",
      "reportState": "completed",
      "reportValue": "{\"offer\":\"Fiber 1Gb Plan\",\"products\":[...]}"
    }
  ],
  "@type": "IntentReport"
}
```

**Validation:**
- ✓ intentReport array populated
- ✓ Report entries contain timestamps
- ✓ reportState indicates processing outcome
- ✓ reportValue contains processing results (offers, products, quotes)

## Test Scenario 6: TMF921 Compliance Verification

### 6.1 Field Naming Compliance

**Test:** Verify TMF921 v5.0.0 field names

```bash
curl -X GET "$API_BASE_URL/tmf-api/intentManagement/v5/intent/$INTENT_ID" \
  -H "X-API-Key: $API_KEY" \
  | jq 'keys'
```

**Required TMF921 Fields (Present):**
- ✓ `lifecycleStatus` (NOT "state")
- ✓ `lastUpdate` (NOT "lastModifiedDate")
- ✓ `statusChangeDate`
- ✓ `creationDate`
- ✓ `validFor` (TimePeriod)
- ✓ `intentExpectation`
- ✓ `characteristic`
- ✓ `expression`
- ✓ `intentRelationship`
- ✓ `relatedParty`
- ✓ `intentReport`

### 6.2 HTTP Status Code Compliance

**Test:** Verify correct HTTP status codes

| Operation | Scenario | Expected Status |
|-----------|----------|----------------|
| POST /intent | Success | 201 Created |
| POST /intent | Missing required field | 400 Bad Request |
| POST /intent | Unauthorized | 401 Unauthorized |
| GET /intent/{id} | Success | 200 OK |
| GET /intent/{id} | Not found | 404 Not Found |
| GET /intent/{id} | Forbidden | 403 Forbidden |
| GET /intent | Success (empty) | 200 OK (empty array) |
| GET /intent | Success (with data) | 200 OK (array) |
| PATCH /intent/{id} | Success | 200 OK |
| DELETE /intent/{id} | Success | 204 No Content |
| DELETE /intent/{id} | Not found | 404 Not Found |

### 6.3 Query Parameter Compliance

**Test:** Verify TMF921 query parameters

```bash
# lifecycleStatus filter
curl "$API_BASE_URL/tmf-api/intentManagement/v5/intent?lifecycleStatus=completed"

# intentType filter
curl "$API_BASE_URL/tmf-api/intentManagement/v5/intent?intentType=CustomerIntent"

# limit parameter
curl "$API_BASE_URL/tmf-api/intentManagement/v5/intent?limit=10"

# offset parameter
curl "$API_BASE_URL/tmf-api/intentManagement/v5/intent?offset=20"
```

**Validation:**
- ✓ lifecycleStatus filter working
- ✓ intentType filter working
- ✓ limit parameter working
- ✓ offset parameter working
- ✓ Multiple filters combinable

## Performance & Load Testing

### Load Test Script

```bash
#!/bin/bash
# Load test: Create 100 concurrent intents

echo "Starting load test: 100 concurrent intent creations"

for i in {1..100}; do
  (
    curl -X POST "$API_BASE_URL/tmf-api/intentManagement/v5/intent" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: $API_KEY" \
      -d "{
        \"name\": \"Load test intent $i\",
        \"description\": \"Testing concurrent intent creation\",
        \"intentType\": \"CustomerIntent\",
        \"priority\": 5
      }" \
      -w "\nRequest $i: %{http_code} in %{time_total}s\n" \
      -o /dev/null -s
  ) &
done

wait
echo "Load test complete"
```

**Performance Criteria:**
- ✓ All 100 requests succeed (201 status)
- ✓ Average response time < 500ms
- ✓ No database deadlocks
- ✓ No memory leaks

## Compliance Summary

### TMF921 v5.0.0 Core Compliance Checklist

- ✅ All core Intent fields implemented
- ✅ Correct field naming (lifecycleStatus, lastUpdate)
- ✅ TimePeriod support for validFor
- ✅ Characteristic generic metadata
- ✅ IntentExpression support
- ✅ EntityRelationship for intent relationships
- ✅ IntentExpectation arrays
- ✅ IntentReport lifecycle tracking
- ✅ Polymorphism fields (@type, @baseType, @schemaLocation)
- ✅ HTTP status codes per TMF921 spec
- ✅ Query parameters (lifecycleStatus, intentType, limit, offset)
- ✅ RESTful endpoints per TMF921 specification
- ✅ Authentication & authorization
- ✅ Mass assignment protection
- ✅ PII protection and GDPR compliance

### Test Execution Report Template

```
TMF921 Compliance Test Report
============================

Test Date: _______________
Tester: _______________
Environment: _______________

Test Results:
-------------
Scenario 1: Complete Intent Lifecycle        [ PASS / FAIL ]
Scenario 2: TMF921 Field Validation          [ PASS / FAIL ]
Scenario 3: Security & Authorization         [ PASS / FAIL ]
Scenario 4: Error Handling                   [ PASS / FAIL ]
Scenario 5: Intent Processing & Reporting    [ PASS / FAIL ]
Scenario 6: TMF921 Compliance Verification   [ PASS / FAIL ]

Performance Tests:
- Load Test (100 concurrent):                [ PASS / FAIL ]
- Average Response Time: _____ ms
- Success Rate: _____ %

Issues Found:
1. ____________________________________________
2. ____________________________________________

Compliance Level: [ Full / Partial / Non-Compliant ]

Certification:
This implementation is TMF921 v5.0.0 [ COMPLIANT / NON-COMPLIANT ]

Signature: _______________
```

---

**Last Updated:** January 8, 2026
**TMF921 Version:** 5.0.0
**Test Coverage:** Core Endpoints (100%)
