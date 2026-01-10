# O2C Sequence Diagrams

This directory contains Mermaid and PlantUML sequence diagrams for the Order-to-Cash (O2C) End-to-End use cases in the Business Intent Agent system.

## Diagram Files

### Mermaid Diagrams (.mmd)

1. **o2c-happy-path.mmd** - Happy path with successful order processing (34 steps)
2. **o2c-pii-failure.mmd** - PII validation failure scenario

### PlantUML Diagrams (.puml)

1. **o2c-complete-lifecycle.puml** - Complete TMF921 lifecycle with all phases (detailed)
2. **o2c-auth-failure.puml** - Authentication failure scenario

## How to View

### Mermaid Diagrams

**Option 1: GitHub** (Automatic rendering)
- View directly on GitHub - markdown files with mermaid blocks are rendered automatically

**Option 2: VS Code**
```bash
# Install Mermaid Preview extension
code --install-extension bierner.markdown-mermaid

# Open .mmd file and press Ctrl+Shift+V (preview)
```

**Option 3: Mermaid Live Editor**
- Visit: https://mermaid.live/
- Paste content from .mmd files
- Export as SVG/PNG

**Option 4: Command Line**
```bash
# Install mermaid-cli
npm install -g @mermaid-js/mermaid-cli

# Generate PNG
mmdc -i o2c-happy-path.mmd -o o2c-happy-path.png

# Generate SVG
mmdc -i o2c-happy-path.mmd -o o2c-happy-path.svg
```

### PlantUML Diagrams

**Option 1: VS Code**
```bash
# Install PlantUML extension
code --install-extension jebbs.plantuml

# Open .puml file and press Alt+D (preview)
```

**Option 2: PlantUML Online**
- Visit: http://www.plantuml.com/plantuml/uml/
- Paste content from .puml files
- Export as PNG/SVG

**Option 3: Command Line**
```bash
# Install PlantUML
brew install plantuml  # macOS
sudo apt-get install plantuml  # Linux

# Generate PNG
plantuml o2c-complete-lifecycle.puml

# Generate SVG
plantuml -tsvg o2c-complete-lifecycle.puml
```

**Option 4: Docker**
```bash
# Generate all diagrams
docker run --rm -v $(pwd):/data plantuml/plantuml *.puml
```

## Diagram Overview

### 1. Happy Path (o2c-happy-path.mmd)

**Description:** Complete successful order flow from intent creation to quote generation

**Key Steps:**
1. Customer authentication
2. TMF921 intent creation (ACKNOWLEDGED)
3. Async processing begins (IN_PROGRESS)
4. Customer profile retrieval
5. PII masking (GDPR compliance)
6. AI intent analysis (Claude Sonnet 4.5)
7. Product catalog search
8. Bundle discovery (Neo4j)
9. AI-powered offer generation
10. Quote generation (Order)
11. Intent completion (COMPLETED)
12. Customer retrieves result

**Duration:** ~3 seconds E2E
**Status Codes:** 201 Created → 200 OK

### 2. Complete Lifecycle (o2c-complete-lifecycle.puml)

**Description:** Detailed TMF921-compliant intent lifecycle with all phases

**Phases:**
- Phase 1: Authentication & Intent Creation
- Phase 2: Async Intent Processing
- Phase 3: Customer Profile Retrieval
- Phase 4: PII Masking (GDPR)
- Phase 5: AI Intent Analysis
- Phase 6: Product Catalog Search
- Phase 7: Bundle Discovery
- Phase 8: AI-Powered Offer Generation
- Phase 9: Quote Generation
- Phase 10: Intent Completion
- Phase 11: Customer Retrieves Result

**Lifecycle States:** ACKNOWLEDGED → IN_PROGRESS → COMPLETED

### 3. Authentication Failure (o2c-auth-failure.puml)

**Description:** Security failure when API key is invalid

**Key Steps:**
1. Customer sends request with invalid API key
2. Authentication middleware validates
3. API key lookup fails
4. Metrics recorded (auth_failure_total)
5. Audit log created
6. 401 Unauthorized returned
7. Intent not created

**Status Code:** 401 Unauthorized

### 4. PII Validation Failure (o2c-pii-failure.mmd)

**Description:** GDPR compliance enforcement when PII masking fails

**Key Steps:**
1. Intent created successfully
2. Customer profile retrieved
3. PII masking attempted
4. Validation detects raw PII (email, phone)
5. Security metrics recorded
6. Error logged (PII violations)
7. Intent marked as FAILED
8. Processing stops (raw PII never sent to Claude AI)

**Lifecycle State:** ACKNOWLEDGED → IN_PROGRESS → FAILED
**Reason:** GDPR Article 32 compliance

## Architecture Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Business Intent Agent** | Express.js + TypeScript | Main API orchestrator |
| **TMF921 Intent Service** | TypeScript | Intent lifecycle management |
| **Intent Processor** | TypeScript | Core business logic |
| **PII Masking Service** | TypeScript | GDPR compliance layer |
| **Claude AI** | Anthropic Claude Sonnet 4.5 | Intent analysis & offer generation |
| **Customer Data MCP** | MCP Server | Customer profiles |
| **BSS/OSS MCP** | MCP Server | Product catalog & quoting |
| **Knowledge Graph MCP** | MCP Server + Neo4j | Product relationships/bundles |
| **Authentication** | Express middleware | API key validation |
| **Response Filter** | Express middleware | Role-based field filtering |
| **Prometheus** | Metrics | Monitoring & observability |

## API Endpoints

### TMF921 Intent Management API

```
POST   /tmf-api/intentManagement/v5/intent              # Create intent
GET    /tmf-api/intentManagement/v5/intent/{id}         # Get intent
GET    /tmf-api/intentManagement/v5/intent              # List intents
PATCH  /tmf-api/intentManagement/v5/intent/{id}         # Update intent
DELETE /tmf-api/intentManagement/v5/intent/{id}         # Delete intent
```

### Health & Monitoring

```
GET    /health      # Health check
GET    /ready       # Readiness probe
GET    /metrics     # Prometheus metrics
```

## Request/Response Examples

### Create Intent Request

```json
POST /tmf-api/intentManagement/v5/intent
Authorization: Bearer sk_a1b2c3d4...

{
  "name": "Upgrade Mobile Plan",
  "description": "I want to upgrade my mobile plan with more data",
  "intentType": "CUSTOMER_INTENT",
  "priority": 5
}
```

### Create Intent Response

```json
HTTP/1.1 201 Created

{
  "id": "intent-uuid-123",
  "href": "/tmf-api/intentManagement/v5/intent/intent-uuid-123",
  "name": "Upgrade Mobile Plan",
  "description": "I want to upgrade my mobile plan with more data",
  "lifecycleStatus": "ACKNOWLEDGED",
  "intentType": "CUSTOMER_INTENT",
  "priority": 5,
  "creationDate": "2026-01-10T15:18:00Z",
  "statusChangeDate": "2026-01-10T15:18:00Z",
  "relatedParty": [
    {
      "id": "CUST-001",
      "role": "customer",
      "@referredType": "Individual"
    }
  ]
}
```

### Get Intent Response (Completed)

```json
GET /tmf-api/intentManagement/v5/intent/intent-uuid-123

HTTP/1.1 200 OK

{
  "id": "intent-uuid-123",
  "lifecycleStatus": "COMPLETED",
  "lastUpdate": "2026-01-10T15:20:00Z",
  "intentReport": [
    {
      "id": "report-1",
      "reportEntry": [
        {
          "reportState": "completed",
          "reportValue": "{\"offer\":\"Premium 5G Bundle\",\"quote\":\"Q-12345\"}",
          "reportingTimeStamp": "2026-01-10T15:20:00Z"
        }
      ]
    }
  ]
}
```

## Performance Metrics

| Metric | Target | Typical |
|--------|--------|---------|
| API Response Time | < 200ms | 150ms |
| Intent Creation | < 100ms | 75ms |
| Async Processing | < 5s | 2-3s |
| PII Masking | < 50ms | 25ms |
| Claude AI Analysis | < 2s | 1.5s |
| Total E2E | < 5s | 2.8s |

## Security & Compliance

### Authentication
- **Method:** API Key (Bearer token)
- **Format:** `sk_{64 hex characters}`
- **Rate Limit:** 100 requests/min per IP
- **Customer Ownership:** Validated per request

### GDPR Compliance
- **PII Masking:** All personal data masked before AI processing
- **Data Minimization:** Only necessary data sent to Claude
- **Audit Logging:** All PII operations logged
- **Validation:** Automated checks prevent raw PII leakage

### TMF921 Compliance
- **Lifecycle:** ACKNOWLEDGED → IN_PROGRESS → COMPLETED/FAILED
- **Reports:** Timestamped status updates
- **Parties:** Customer ownership tracked
- **REST API:** Full CRUD operations

## Error Codes

| Code | Scenario | Action |
|------|----------|--------|
| 201 | Intent created | Poll for completion |
| 200 | Intent retrieved | Process response |
| 401 | Authentication failed | Check API key |
| 403 | Forbidden | Verify ownership |
| 429 | Rate limit | Wait & retry |
| 500 | Server error | Retry with backoff |

## Troubleshooting

### Intent stuck in IN_PROGRESS
- Check Claude AI rate limits
- Verify MCP services are running
- Check logs: `kubectl logs -n intent-platform -l app=business-intent-agent`

### PII validation failures
- Review PII masking configuration
- Check security logs
- Verify customer data format

### Authentication errors
- Verify API key is valid
- Check key has not expired
- Ensure correct Authorization header format

## Related Documentation

- **Main Documentation:** [/docs/O2C_SEQUENCE_DIAGRAMS.md](../O2C_SEQUENCE_DIAGRAMS.md)
- **API Authentication:** [/src/API_AUTHENTICATION.md](../../src/API_AUTHENTICATION.md)
- **PII Masking:** [/src/PII_MASKING.md](../../src/PII_MASKING.md)
- **Security Policy:** [/SECURITY.md](../../SECURITY.md)
- **TMF921 Spec:** https://www.tmforum.org/resources/specification/tmf921-intent-management-api-v5-0-0/

## Contributing

When adding new diagrams:

1. Use consistent naming: `o2c-{scenario}.{mmd|puml}`
2. Add autonumbering to all sequence diagrams
3. Include clear notes for complex steps
4. Document in this README
5. Test rendering in multiple viewers

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-10 | Initial diagrams: happy path, complete lifecycle, error scenarios |

---

**Maintained by:** Business Intent Agent Team
**Last Updated:** January 10, 2026
**Status:** Production Ready
