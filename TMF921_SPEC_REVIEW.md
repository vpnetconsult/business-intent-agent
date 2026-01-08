# TMF921 Specification Review & Gap Analysis

## Overview

This document reviews the official TMF921 Intent Management API v5.0.0 specification against our implementation and identifies gaps, enhancements, and alignment opportunities.

## Official Specification Files Reviewed

1. **TMF921_Intent_Management_v5.0.0.oas.yaml** - OpenAPI 3.0.1 specification
2. **TMF921-Intent_Management-RI-v5.0.0** - Reference Implementation (Node.js/Express)
3. **TMF921_Intent_Management_v5.0.0_specification.pdf** - Full specification document
4. **TMF921A_Intent_Management_API_Profile_v1.1.0.pdf** - API Profile

## Current Implementation vs. Official Spec

### ✅ What We Implemented Correctly

| Feature | Our Implementation | Official Spec | Status |
|---------|-------------------|---------------|---------|
| **API Base Path** | `/tmf-api/intentManagement/v5` | `/tmf-api/intentManagement/v5` | ✅ Correct |
| **POST /intent** | Create intent | Create intent | ✅ Implemented |
| **GET /intent/{id}** | Retrieve intent | Retrieve intent | ✅ Implemented |
| **GET /intent** | List intents | List intents | ✅ Implemented |
| **PATCH /intent/{id}** | Update intent | Update intent | ✅ Implemented |
| **DELETE /intent/{id}** | Delete intent | Delete intent | ✅ Implemented |
| **Authentication** | API Key (X-API-Key) | Not specified (extensible) | ✅ Valid |
| **Response Codes** | 200, 201, 204, 400, 401, 403, 404, 500 | 200, 201, 202, 204, 400, 401, 403, 404, 405, 409, 500, 501, 503 | ⚠️ Missing some codes |

### ⚠️ Missing Fields in Intent Resource

Our current `Intent` type is missing several fields from the official spec:

#### Fields We Have ✅
- `id`, `href`, `name`, `description`
- `intentType`, `priority`, `state` (as lifecycleStatus)
- `creationDate`, `lastModifiedDate` (as lastUpdate)
- `intentExpectation`, `intentReport`, `relatedParty`
- `intentSpecification`
- `@type`, `@baseType`, `@schemaLocation`

#### Fields We're Missing ❌
```typescript
// From official spec - missing in our implementation:
{
  validFor: TimePeriod,              // Validity period for the intent
  isBundle: boolean,                  // Whether intent is a bundle
  statusChangeDate: date-time,        // When status last changed
  context: string,                    // Context string for the intent
  version: string,                    // Version identifier
  intentRelationship: EntityRelationship[],  // Related intents
  characteristic: Characteristic[],   // Generic characteristics
  attachment: AttachmentRefOrValue[], // Attachments (docs, media)
  expression: IntentExpression,       // Formal intent expression (JSON-LD, Turtle)
  lifecycleStatus: string            // We use 'state' instead
}
```

### 🔴 Missing Resources/Endpoints

#### 1. **IntentReport Resource** (Partially Implemented)

**Official Spec:**
- `GET /intent/{intentId}/intentReport` - List all reports for an intent
- `GET /intent/{intentId}/intentReport/{reportId}` - Get specific report
- `DELETE /intent/{intentId}/intentReport/{reportId}` - Delete report

**Our Implementation:**
- ✅ IntentReport included in Intent resource
- ❌ No dedicated endpoints for IntentReport management
- ❌ Cannot query reports independently

#### 2. **IntentSpecification Resource** (Not Implemented)

**Official Spec defines:**
- `GET /intentSpecification` - List intent specifications
- `POST /intentSpecification` - Create specification
- `GET /intentSpecification/{id}` - Get specification
- `PATCH /intentSpecification/{id}` - Update specification
- `DELETE /intentSpecification/{id}` - Delete specification

**Purpose:** Intent specifications define reusable intent templates/patterns that intents can reference.

**Our Implementation:**
- ❌ Not implemented
- ⚠️ We only reference intentSpecification as an EntityRef

#### 3. **Event Subscription Hub** (Not Implemented)

**Official Spec:**
- `POST /hub` - Subscribe to intent events
- `DELETE /hub/{id}` - Unsubscribe from events

**Event Types:**
- IntentCreateEvent
- IntentStateChangeEvent (we call it IntentStatusChangeEvent)
- IntentAttributeValueChangeEvent
- IntentDeleteEvent
- IntentReportStateChangeEvent

**Our Implementation:**
- ❌ No event subscription mechanism
- ❌ No webhooks/notifications for intent changes
- ✅ We defined event types but don't emit them

#### 4. **Notification Listeners** (Not Implemented)

**Official Spec defines client listener endpoints:**
- `/listener/intentCreateEvent`
- `/listener/intentStatusChangeEvent`
- `/listener/intentAttributeValueChangeEvent`
- `/listener/intentDeleteEvent`
- `/listener/intentReportStateChangeEvent`

### 🔍 Intent Expression (Advanced Feature)

The official spec supports formal intent expressions:

```yaml
IntentExpression:
  properties:
    iri: string  # Internationalized Resource Identifier
  discriminator:
    mapping:
      IntentExpression: base
      JsonLdExpression: JSON-LD format
      TurtleExpression: Turtle/RDF format
```

**Use Case:** Allows machine-readable, semantic intent definitions for autonomous systems.

**Our Implementation:**
- ❌ Not implemented
- ⚠️ We extract intent from description/expectations manually

### 📊 Query Parameters & Filtering

#### Official Spec Query Parameters:

**GET /intent:**
- `fields` - Comma-separated properties to include in response
- `offset` - Pagination offset (✅ we support)
- `limit` - Pagination limit (✅ we support)
- **Missing:** Field selection support

**Examples from spec:**
```
GET /intent?fields=id,name,lifecycleStatus
GET /intent?lifecycleStatus=active&priority=high
```

**Our Implementation:**
- ✅ Basic filtering by state, intentType
- ❌ No field selection
- ❌ No arbitrary field filtering

### 🔒 Response Codes We're Missing

| Code | Purpose | When to Use |
|------|---------|-------------|
| 202 | Accepted | Async processing accepted (spec supports this for POST/PATCH/DELETE) |
| 405 | Method Not Allowed | Invalid HTTP method for endpoint |
| 409 | Conflict | Intent already exists or update conflict |
| 501 | Not Implemented | Feature not yet supported |
| 503 | Service Unavailable | Temporary service issue |

### 📋 Characteristic Support

The official spec includes a generic `Characteristic` array:

```yaml
Characteristic:
  properties:
    name: string
    value: any
    valueType: string
```

**Purpose:** Allows adding arbitrary metadata to intents without schema changes.

**Example:**
```json
{
  "characteristic": [
    {"name": "urgency", "value": "high", "valueType": "string"},
    {"name": "customerSegment", "value": "enterprise", "valueType": "string"}
  ]
}
```

**Our Implementation:**
- ❌ Not supported
- ⚠️ We use intentExpectation instead (which is more structured)

## Reference Implementation Analysis

### Architecture (from TMF921-Intent_Management-RI)

```
controllers/
  ├── IntentController.js       - Routes requests to services
  └── Controller.js             - Generic controller base class

services/
  ├── IntentService.js          - Business logic for Intent CRUD
  └── Service.js                - Generic service helpers

api/
  └── openapi.yaml              - API specification

utils/
  └── openapiRouter.js          - Routes based on operationId
```

**Key Differences from Our Implementation:**

| Aspect | Reference Impl | Our Implementation |
|--------|----------------|-------------------|
| **Framework** | Express.js | Express.js ✅ |
| **Validation** | express-openapi-validator | Manual validation + mass assignment protection ✅ Better |
| **Storage** | File-based JSON | In-memory Map ⚠️ Similar (both need DB) |
| **Auth** | Not included | API Key middleware ✅ Better |
| **Integration** | Standalone | Integrated with IntentProcessor ✅ Better |
| **Async Processing** | Not included | Full async with state tracking ✅ Better |

### What We Do Better ✨

1. **Security**
   - ✅ API key authentication
   - ✅ Customer ownership validation
   - ✅ Mass assignment protection
   - ✅ PII masking
   - ✅ Role-based response filtering

2. **Business Integration**
   - ✅ Integration with existing IntentProcessor
   - ✅ Async intent processing with state machine
   - ✅ Intent reporting with processing results
   - ✅ Claude AI integration for intent analysis

3. **Production Features**
   - ✅ Comprehensive logging (pino)
   - ✅ Metrics/monitoring (Prometheus)
   - ✅ Health checks
   - ✅ Rate limiting
   - ✅ Graceful shutdown

## Recommendations & Enhancement Plan

### Priority 1: Critical for Compliance 🔴

1. **Add Missing Intent Fields**
   ```typescript
   interface Intent {
     // Add:
     validFor?: TimePeriod;
     isBundle?: boolean;
     statusChangeDate?: string;
     context?: string;
     version?: string;
     characteristic?: Characteristic[];
     expression?: IntentExpression;
   }
   ```

2. **Rename Field for Spec Compliance**
   - Change `state` → `lifecycleStatus`
   - Change `lastModifiedDate` → `lastUpdate`

3. **Add Missing HTTP Response Codes**
   - 202 Accepted (for async operations)
   - 405 Method Not Allowed
   - 409 Conflict
   - 501 Not Implemented

### Priority 2: Important for Interoperability 🟡

4. **Implement IntentReport Endpoints**
   ```
   GET    /intent/{intentId}/intentReport
   GET    /intent/{intentId}/intentReport/{reportId}
   DELETE /intent/{intentId}/intentReport/{reportId}
   ```

5. **Add Query Parameter Support**
   - Field selection: `?fields=id,name,lifecycleStatus`
   - Generic filtering: `?lifecycleStatus=active&priority=high`

6. **Implement IntentSpecification Resource**
   - Full CRUD for intent templates/patterns
   - Allow intents to reference specifications

### Priority 3: Advanced Features 🟢

7. **Event Subscription Hub**
   - POST /hub - Subscribe to events
   - DELETE /hub/{id} - Unsubscribe
   - Event publishing via webhooks

8. **Intent Expression Support**
   - JSON-LD expressions for semantic intents
   - Turtle/RDF format support
   - Machine-readable intent definitions

9. **Intent Relationships**
   - Link related intents
   - Support intent bundling
   - Hierarchical intent structures

### Priority 4: Nice to Have 🔵

10. **Attachment Support**
    - Upload documents/media for intents
    - Link external resources
    - Base64 embedded content

11. **Advanced Validation**
    - OpenAPI validator middleware
    - Automatic schema validation
    - Request/response validation

## Migration Path

### Phase 1: Compliance (Week 1)
- Add missing Intent fields
- Rename state → lifecycleStatus
- Add missing HTTP codes
- Update documentation

### Phase 2: Reports (Week 2)
- Implement IntentReport endpoints
- Add report filtering
- Update tests

### Phase 3: Specifications (Week 3-4)
- Implement IntentSpecification resource
- Create default specifications
- Link intents to specs

### Phase 4: Events (Week 5-6)
- Implement hub subscription
- Add webhook notifications
- Event publishing system

## Conclusion

### Our Implementation Score: 7.5/10

**Strengths:**
- ✅ Core CRUD operations fully functional
- ✅ Superior security and authentication
- ✅ Production-ready features
- ✅ Business logic integration
- ✅ Async processing with state tracking

**Gaps:**
- ❌ Missing some Intent fields
- ❌ No IntentSpecification resource
- ❌ No event subscription mechanism
- ❌ Limited query parameter support
- ❌ No IntentReport endpoints

### Recommendation

**For Production Use:**
- Current implementation is functional and secure
- Supports basic TMF921 operations
- Can be deployed as-is for MVP

**For Full TMF921 Compliance:**
- Implement Priority 1 & 2 items
- Add IntentSpecification resource
- Implement event subscriptions
- Support full query parameters

**Timeline:**
- Minimal compliance: 1-2 weeks
- Full compliance: 4-6 weeks
- Advanced features: 8-12 weeks

## Resources

- [TMF921 v5.0.0 Specification](https://www.tmforum.org/resources/specifications/tmf921-intent-management-api-user-guide-v5-0-0/)
- [TMF921A API Profile v1.1.0](https://www.tmforum.org/resources/how-to-guide/tmf921a-intent-management-api-profile-v1-1-0/)
- [TM Forum GitHub - Reference Implementation](https://github.com/tmforum-rand/Open_Api_And_Data_Model)
- [OpenAPI Specification](https://spec.openapis.org/oas/v3.0.1)

---

**Reviewed:** December 28, 2025
**Specification Version:** TMF921 v5.0.0
**Implementation Version:** 1.0.0
