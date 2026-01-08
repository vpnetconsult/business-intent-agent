# TMF921 Intent Management API Integration

This document describes the TMF921 Intent Management API implementation in the Business Intent Agent.

## Overview

The Business Intent Agent now supports the **TMF921 Intent Management API v5.0.0** specification from TM Forum. This provides a standards-compliant interface for intent-based automation in telecommunications and digital services.

### What is TMF921?

TMF921 is TM Forum's Intent Management API specification that enables:
- Intent-driven automation and autonomous networks
- Communication between intent owners and intent handlers
- Intent lifecycle management (create, update, monitor, delete)
- Intent reporting and compliance tracking
- Intent negotiation between stakeholders

## API Endpoints

All TMF921 endpoints are mounted at the base path: `/tmf-api/intentManagement/v5`

### 1. Create Intent

**POST** `/tmf-api/intentManagement/v5/intent`

Create a new customer intent that will be processed asynchronously.

**Authentication:** Required (API Key)

**Request Body:**
```json
{
  "name": "High-speed internet upgrade",
  "description": "I need faster internet for working from home",
  "intentType": "CustomerIntent",
  "priority": 5,
  "validFor": {
    "startDateTime": "2025-01-01T00:00:00Z",
    "endDateTime": "2025-12-31T23:59:59Z"
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
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "href": "/tmf-api/intentManagement/v5/intent/550e8400-e29b-41d4-a716-446655440000",
  "name": "High-speed internet upgrade",
  "description": "I need faster internet for working from home",
  "intentType": "CustomerIntent",
  "priority": 5,
  "lifecycleStatus": "acknowledged",
  "statusChangeDate": "2025-12-28T12:00:00.000Z",
  "creationDate": "2025-12-28T12:00:00.000Z",
  "lastUpdate": "2025-12-28T12:00:00.000Z",
  "version": "1.0",
  "context": "work-from-home",
  "isBundle": false,
  "validFor": {
    "startDateTime": "2025-01-01T00:00:00Z",
    "endDateTime": "2025-12-31T23:59:59Z"
  },
  "intentExpectation": [...],
  "characteristic": [
    {
      "name": "urgency",
      "value": "high",
      "valueType": "string"
    }
  ],
  "relatedParty": [
    {
      "id": "CUST123",
      "role": "customer",
      "@referredType": "Individual"
    }
  ],
  "intentReport": []
}
```

### 2. Get Intent

**GET** `/tmf-api/intentManagement/v5/intent/{id}`

Retrieve a specific intent by ID.

**Authentication:** Required (API Key)

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "High-speed internet upgrade",
  "state": "completed",
  "intentReport": [
    {
      "id": "report-001",
      "creationDate": "2025-12-28T12:01:00.000Z",
      "reportEntry": [
        {
          "reportingTimeStamp": "2025-12-28T12:01:00.000Z",
          "reportState": "completed",
          "reportValue": "{\"offer\":\"Fiber 1Gb Plan\",\"products\":[...]}"
        }
      ]
    }
  ]
}
```

### 3. List Intents

**GET** `/tmf-api/intentManagement/v5/intent`

List all intents for the authenticated customer with optional filters.

**Authentication:** Required (API Key)

**Query Parameters:**
- `lifecycleStatus` - Filter by lifecycle status (acknowledged, inProgress, completed, failed, cancelled, active, inactive)
- `intentType` - Filter by intent type (ServiceIntent, CustomerIntent, etc.)
- `limit` - Maximum number of results (default: 100)
- `offset` - Pagination offset (default: 0)

**Response:** `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "High-speed internet upgrade",
    "state": "completed",
    ...
  },
  {
    "id": "660f9511-f3ac-52e5-b827-557766551111",
    "name": "Mobile plan upgrade",
    "state": "inProgress",
    ...
  }
]
```

### 4. Update Intent

**PATCH** `/tmf-api/intentManagement/v5/intent/{id}`

Update an existing intent.

**Authentication:** Required (API Key)

**Request Body:**
```json
{
  "description": "Updated requirements: need 2000Mbps instead",
  "priority": 8
}
```

**Response:** `200 OK` (returns updated intent)

### 5. Delete Intent

**DELETE** `/tmf-api/intentManagement/v5/intent/{id}`

Cancel and delete an intent.

**Authentication:** Required (API Key)

**Response:** `204 No Content`

## Intent Lifecycle States

Intents progress through the following `lifecycleStatus` values (TMF921 spec compliant):

1. **acknowledged** - Intent created and accepted by the system
2. **pending** - Intent queued for processing
3. **inProgress** - Intent is being processed
4. **completed** - Intent successfully processed, offer generated
5. **failed** - Intent processing failed
6. **cancelled** - Intent cancelled by user
7. **active** - Intent is active and being monitored
8. **inactive** - Intent is inactive/suspended

**Note:** Field name changed from `state` to `lifecycleStatus` for TMF921 v5.0.0 compliance.

## Intent Types

- **CustomerIntent** - Customer-initiated intent (default)
- **ServiceIntent** - Service-level intent
- **DeliveryIntent** - Delivery and fulfillment intent
- **AssuranceIntent** - Service assurance and SLA intent

## Integration with Existing Intent Processor

The TMF921 API integrates seamlessly with the existing `IntentProcessor`:

1. TMF921 intent is created via POST `/tmf-api/intentManagement/v5/intent`
2. Intent state is set to `acknowledged`
3. Intent is processed asynchronously using the existing `IntentProcessor`
4. State transitions: `acknowledged` → `inProgress` → `completed`/`failed`
5. Intent reports are added with processing results
6. Customer can query intent status via GET `/tmf-api/intentManagement/v5/intent/{id}`

## Example Usage

### 1. Create an Intent

```bash
curl -X POST https://api.example.com/tmf-api/intentManagement/v5/intent \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "name": "5G upgrade request",
    "description": "I want to upgrade to 5G service",
    "intentType": "CustomerIntent",
    "priority": 7
  }'
```

### 2. Check Intent Status

```bash
curl https://api.example.com/tmf-api/intentManagement/v5/intent/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-API-Key: your-api-key"
```

### 3. List All My Intents

```bash
curl "https://api.example.com/tmf-api/intentManagement/v5/intent?lifecycleStatus=completed&limit=10" \
  -H "X-API-Key: your-api-key"
```

### 4. Cancel an Intent

```bash
curl -X DELETE https://api.example.com/tmf-api/intentManagement/v5/intent/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-API-Key: your-api-key"
```

## Migration from Legacy Intent API

### Legacy API (still supported)
```
POST /api/v1/intent
```

### New TMF921 API
```
POST /tmf-api/intentManagement/v5/intent
```

### Key Differences

| Feature | Legacy API | TMF921 API |
|---------|------------|------------|
| Standard | Proprietary | TM Forum TMF921 v5.0.0 |
| Intent Lifecycle | Single request/response | Async with lifecycle tracking |
| Intent History | No | Yes (via intentReport) |
| Multi-party | No | Yes (relatedParty) |
| Expectations | No | Yes (intentExpectation) |
| Monitoring | No | Yes (GET /intent/{id}) |
| Characteristics | No | Yes (generic metadata) |
| Validity Period | No | Yes (validFor) |
| Versioning | No | Yes (version field) |
| Context | No | Yes (context field) |
| Expression | No | Yes (semantic expressions) |

### Migration Path

1. **Parallel Operation**: Both APIs are available simultaneously
2. **New Features**: Use TMF921 for advanced features (expectations, reporting, multi-party)
3. **Legacy Support**: Existing integrations continue to work with `/api/v1/intent`
4. **Gradual Migration**: Move clients to TMF921 over time

## Security

### Authentication
All TMF921 endpoints require API key authentication via `X-API-Key` header.

### Authorization
- Users can only access their own intents
- Intent access is verified through `relatedParty` relationship
- Customer ownership is validated on all operations

### Mass Assignment Protection
Input fields are whitelisted to prevent mass assignment attacks:
- Create: `name`, `description`, `intentType`, `priority`, `intentExpectation`, etc.
- Update: `name`, `description`, `priority`, `state`, `intentExpectation`

### PII Protection
- Customer data is masked before processing with AI
- Response filtering based on user roles
- GDPR compliance maintained

## References

- [TMF921 Intent Management API User Guide v5.0.0](https://www.tmforum.org/resources/specifications/tmf921-intent-management-api-user-guide-v5-0-0/)
- [TM Forum Intent-Based Automation](https://www.tmforum.org/opendigitalframework/intent-based-automation/)
- [TMF921A Intent Management API Profile v1.1.0](https://www.tmforum.org/resources/how-to-guide/tmf921a-intent-management-api-profile-v1-1-0/)

## Support

For questions or issues with the TMF921 API implementation:
- Check application logs for detailed error messages
- Review intent reports for processing status
- Contact: support@vpnetconsulting.com

## TMF921 v5.0.0 Compliance

### Spec Compliance Level: Full Core Compliance ✅

**Implemented Features:**
- ✅ All TMF921 v5.0.0 Intent fields
- ✅ lifecycleStatus (not state) - spec compliant
- ✅ lastUpdate (not lastModifiedDate) - spec compliant
- ✅ TimePeriod for validFor
- ✅ Characteristic generic metadata
- ✅ IntentExpression support
- ✅ EntityRelationship for related intents
- ✅ Proper HTTP response codes (201, 202, 204, 400, 401, 403, 404, 500)
- ✅ Query parameters (lifecycleStatus, intentType, limit, offset)

**Not Implemented (Optional):**
- IntentReport dedicated endpoints
- IntentSpecification resource
- Event subscription hub
- Notification listeners

**Deviations from Spec:**
- None - Core endpoints are fully TMF921 v5.0.0 compliant

---

**Implementation Date:** December 28, 2025
**TMF921 Version:** 5.0.0 (Full Core Compliance)
**Business Intent Agent Version:** 1.0.0
**Last Updated:** December 28, 2025 (Critical compliance update)
