# Order-to-Cash (O2C) E2E Sequence Diagrams

**Business Intent Agent - TMF921 Intent Management API**

This document contains comprehensive sequence diagrams for all Order-to-Cash (O2C) use cases in the Business Intent Agent system.

---

## Table of Contents

1. [Happy Path - Successful Order Processing](#1-happy-path---successful-order-processing)
2. [Authentication Failure](#2-authentication-failure)
3. [PII Validation Failure](#3-pii-validation-failure)
4. [Intent Processing Failure](#4-intent-processing-failure)
5. [Complete O2C with TMF921 Lifecycle](#5-complete-o2c-with-tmf921-lifecycle)

---

## Architecture Overview

The system consists of:
- **API Gateway/Client**: External client (web/mobile app)
- **Business Intent Agent**: Main orchestrator with TMF921 API
- **TMF921 Intent Service**: Intent lifecycle management
- **Intent Processor**: Core business logic
- **PII Masking Service**: GDPR compliance layer
- **Claude AI**: Intent analysis and offer generation
- **MCP Services**:
  - Customer Data MCP: Customer profiles
  - BSS/OSS MCP: Product catalog and quoting
  - Knowledge Graph MCP: Product relationships/bundles

---

## 1. Happy Path - Successful Order Processing

### Mermaid Diagram

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer/API Client
    participant API as Business Intent Agent<br/>(Express API)
    participant Auth as Authentication<br/>Middleware
    participant RateLimit as Rate Limiter
    participant TMF921 as TMF921 Intent Service
    participant IntentProc as Intent Processor
    participant PII as PII Masking Service
    participant CustomerMCP as Customer Data MCP
    participant Claude as Claude AI<br/>(Sonnet 4.5)
    participant BSSMCP as BSS/OSS MCP
    participant KnowledgeMCP as Knowledge Graph MCP
    participant ResponseFilter as Response Filter<br/>(RBAC)

    %% Step 1-4: Request Authentication & Validation
    Customer->>+API: POST /tmf-api/intentManagement/v5/intent<br/>{name, description, intentType}
    API->>+Auth: Authenticate API Key
    Auth->>Auth: Validate Bearer Token
    Auth->>Auth: Verify Customer Ownership
    Auth-->>-API: ✓ Authenticated (customerId: CUST-001)

    API->>+RateLimit: Check Rate Limit
    RateLimit->>RateLimit: Verify: < 100 req/min
    RateLimit-->>-API: ✓ Within Limits

    %% Step 5-7: TMF921 Intent Creation
    API->>+TMF921: createIntent(intentCreate, customerId)
    TMF921->>TMF921: Generate Intent ID (UUID)
    TMF921->>TMF921: Set lifecycleStatus = ACKNOWLEDGED
    TMF921->>TMF921: Add relatedParty (customer)
    TMF921->>TMF921: Store Intent
    TMF921-->>API: Intent Created<br/>{id, lifecycleStatus: ACKNOWLEDGED}

    %% Step 8: Async Processing Starts
    TMF921->>+IntentProc: processIntentAsync(intent, customerId)
    Note over TMF921,IntentProc: Async processing begins<br/>API responds immediately
    API-->>-Customer: 201 Created<br/>{intent: {...}, lifecycleStatus: ACKNOWLEDGED}

    %% Step 9: Update to IN_PROGRESS
    IntentProc->>TMF921: Update lifecycleStatus = IN_PROGRESS
    TMF921->>TMF921: Add IntentReport: "processing started"

    %% Step 10-12: Get Customer Profile
    IntentProc->>+CustomerMCP: get_customer_profile(CUST-001)
    CustomerMCP->>CustomerMCP: Query Customer DB
    CustomerMCP-->>-IntentProc: {customerId, name, email,<br/>segment: premium, creditScore: excellent}

    %% Step 13-16: PII Masking (GDPR Compliance)
    IntentProc->>+PII: maskCustomerProfile(profile)
    PII->>PII: Hash name: SHA-256
    PII->>PII: Remove email (high-risk PII)
    PII->>PII: Generalize location: Dublin, Ireland
    PII->>PII: Tier credit score: excellent → high
    PII->>PII: Validate no raw PII remains
    PII-->>-IntentProc: Masked Profile<br/>{customer_id_hash, segment, credit_tier: high}

    %% Step 17-19: AI Intent Analysis
    IntentProc->>+Claude: analyzeIntent(intent, maskedProfile)
    Note over Claude: Claude Sonnet 4.5<br/>Analyzes: "I want to upgrade<br/>my mobile plan"
    Claude->>Claude: Extract intent tags:<br/>[mobile, upgrade, data]
    Claude->>Claude: Identify product types:<br/>[5G_PLAN, DATA_ADDON]
    Claude-->>-IntentProc: {tags: [mobile, upgrade],<br/>product_types: [5G_PLAN, DATA_ADDON],<br/>confidence: 0.95}

    %% Step 20-22: Search Product Catalog
    IntentProc->>+BSSMCP: search_product_catalog({<br/>intent: [mobile, upgrade],<br/>customer_segment: premium})
    BSSMCP->>BSSMCP: Query Product Catalog
    BSSMCP->>BSSMCP: Filter by segment eligibility
    BSSMCP-->>-IntentProc: [{id: 5G-UNLIMITED,<br/>name: 5G Unlimited Premium,<br/>price: 49.99}]

    %% Step 23-25: Find Related Products (Bundles)
    IntentProc->>+KnowledgeMCP: find_related_products({<br/>base_products: [5G_PLAN]})
    KnowledgeMCP->>KnowledgeMCP: Query Neo4j Graph:<br/>MATCH (p:Product)-[:BUNDLED_WITH]->(b:Bundle)
    KnowledgeMCP-->>-IntentProc: [{id: PREMIUM-BUNDLE,<br/>name: 5G + Netflix + Disney+,<br/>discount: 15%}]

    %% Step 26-28: Generate Personalized Offer
    IntentProc->>+Claude: generateOffer({intent, customer,<br/>products, bundles})
    Note over Claude: AI-powered personalization<br/>based on customer segment
    Claude->>Claude: Analyze customer preferences
    Claude->>Claude: Calculate optimal bundle
    Claude->>Claude: Determine discount eligibility
    Claude-->>-IntentProc: {name: Premium 5G Bundle,<br/>selected_products: [5G-UNLIMITED, NETFLIX],<br/>recommended_discounts: [{type: loyalty, value: 10%}]}

    %% Step 29-31: Generate Quote (Order)
    IntentProc->>+BSSMCP: generate_quote({<br/>customer_id: CUST-001,<br/>products: [5G-UNLIMITED, NETFLIX],<br/>discounts: [loyalty: 10%]})
    BSSMCP->>BSSMCP: Calculate pricing
    BSSMCP->>BSSMCP: Apply discounts
    BSSMCP->>BSSMCP: Generate quote ID
    BSSMCP-->>-IntentProc: {quote_id: Q-12345,<br/>total_monthly: 54.99,<br/>discount_applied: 10%,<br/>valid_until: 2026-01-17}

    %% Step 32-33: Update Intent to COMPLETED
    IntentProc->>TMF921: Update lifecycleStatus = COMPLETED
    TMF921->>TMF921: Add IntentReport: "completed"<br/>{offer, products, quote}
    IntentProc-->>-TMF921: Processing Complete

    %% Step 34: Customer Polls for Status
    Customer->>+API: GET /tmf-api/intentManagement/v5/intent/{id}
    API->>+TMF921: getIntent(id)
    TMF921-->>-API: Intent with lifecycleStatus: COMPLETED
    API->>+ResponseFilter: Filter response by customer role
    ResponseFilter->>ResponseFilter: Redact PII for customer role
    ResponseFilter->>ResponseFilter: Remove internal fields
    ResponseFilter-->>-API: Filtered Response
    API-->>-Customer: 200 OK<br/>{intent, lifecycleStatus: COMPLETED,<br/>offer, quote}

    Note over Customer,API: Customer can now proceed<br/>to checkout/payment with quote Q-12345
\`\`\`

---

## 2. Authentication Failure

### Mermaid Diagram

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer/API Client
    participant API as Business Intent Agent
    participant Auth as Authentication<br/>Middleware
    participant Metrics as Prometheus Metrics
    participant Logger as Audit Logger

    Customer->>+API: POST /tmf-api/intentManagement/v5/intent<br/>Authorization: Bearer invalid_key_123
    API->>+Auth: Authenticate API Key
    Auth->>Auth: Extract Bearer token
    Auth->>Auth: Lookup API key in secrets
    Auth->>Auth: ✗ API key not found

    Auth->>+Metrics: auth_failure_total{reason="invalid_key"}++
    Metrics-->>-Auth: Metric recorded

    Auth->>+Logger: Log authentication failure<br/>{ip, timestamp, key_prefix}
    Logger-->>-Auth: Audit log created

    Auth-->>-API: 401 Unauthorized
    API-->>-Customer: 401 Unauthorized<br/>{error: "Invalid API key",<br/>message: "Authentication required"}

    Note over Customer,API: Intent not created<br/>Customer must obtain valid API key
\`\`\`

### PlantUML Diagram

\`\`\`plantuml
@startuml O2C_Authentication_Failure
autonumber
title Order-to-Cash - Authentication Failure

actor "Customer/API Client" as Customer
participant "Business Intent Agent" as API
participant "Authentication\nMiddleware" as Auth
participant "Prometheus Metrics" as Metrics
participant "Audit Logger" as Logger

Customer -> API: POST /tmf-api/intentManagement/v5/intent\nAuthorization: Bearer invalid_key_123
activate API

API -> Auth: Authenticate API Key
activate Auth

Auth -> Auth: Extract Bearer token
Auth -> Auth: Lookup API key in secrets
Auth -> Auth: ✗ API key not found

Auth -> Metrics: auth_failure_total{reason="invalid_key"}++
activate Metrics
Metrics --> Auth: Metric recorded
deactivate Metrics

Auth -> Logger: Log authentication failure\n{ip, timestamp, key_prefix}
activate Logger
Logger --> Auth: Audit log created
deactivate Logger

Auth --> API: 401 Unauthorized
deactivate Auth

API --> Customer: 401 Unauthorized\n{error: "Invalid API key",\nmessage: "Authentication required"}
deactivate API

note over Customer,API
  Intent not created
  Customer must obtain valid API key
end note

@enduml
\`\`\`

---

## 3. PII Validation Failure

### Mermaid Diagram

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer/API Client
    participant API as Business Intent Agent
    participant Auth as Authentication
    participant TMF921 as TMF921 Intent Service
    participant IntentProc as Intent Processor
    participant CustomerMCP as Customer Data MCP
    participant PII as PII Masking Service
    participant Metrics as Prometheus Metrics
    participant Logger as Security Logger

    Customer->>+API: POST /tmf-api/intentManagement/v5/intent
    API->>+Auth: Authenticate API Key
    Auth-->>-API: ✓ Authenticated (CUST-001)

    API->>+TMF921: createIntent(intentCreate, customerId)
    TMF921->>TMF921: Create Intent (ACKNOWLEDGED)
    TMF921-->>API: Intent Created
    API-->>-Customer: 201 Created

    TMF921->>+IntentProc: processIntentAsync()
    IntentProc->>TMF921: Update status = IN_PROGRESS

    IntentProc->>+CustomerMCP: get_customer_profile(CUST-001)
    CustomerMCP-->>-IntentProc: Customer Profile

    IntentProc->>+PII: maskCustomerProfile(profile)
    PII->>PII: Mask PII fields

    %% PII Validation Fails
    PII->>PII: validateNoRawPII(maskedProfile)
    PII->>PII: ✗ VIOLATION: Raw email detected<br/>"john.doe@example.com"
    PII->>PII: ✗ VIOLATION: Raw phone detected<br/>"+353-1-234-5678"

    PII->>+Metrics: pii_masking_failures_total++
    Metrics-->>-PII: Metric recorded

    PII->>+Logger: ERROR: PII validation failed<br/>{violations: [email, phone],<br/>customerId: REDACTED}
    Logger-->>-PII: Security log created

    PII-->>-IntentProc: Error: PII validation failed

    IntentProc->>TMF921: Update lifecycleStatus = FAILED
    TMF921->>TMF921: Add IntentReport: "failed"<br/>reason: "PII validation error"
    IntentProc-->>-TMF921: Processing Failed

    Customer->>+API: GET /tmf-api/intentManagement/v5/intent/{id}
    API->>+TMF921: getIntent(id)
    TMF921-->>-API: Intent (lifecycleStatus: FAILED)
    API-->>-Customer: 200 OK<br/>{lifecycleStatus: FAILED,<br/>error: "Data protection error"}

    Note over Customer,API: GDPR compliance enforced<br/>Raw PII never sent to external AI
\`\`\`

---

## 4. Intent Processing Failure

### Mermaid Diagram

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer/API Client
    participant API as Business Intent Agent
    participant TMF921 as TMF921 Intent Service
    participant IntentProc as Intent Processor
    participant CustomerMCP as Customer Data MCP
    participant PII as PII Masking
    participant Claude as Claude AI
    participant Metrics as Prometheus Metrics
    participant Logger as Error Logger

    Customer->>+API: POST /tmf-api/intentManagement/v5/intent
    API->>+TMF921: createIntent()
    TMF921->>TMF921: Create Intent (ACKNOWLEDGED)
    TMF921-->>API: Intent Created
    API-->>-Customer: 201 Created

    TMF921->>+IntentProc: processIntentAsync()
    IntentProc->>TMF921: Update status = IN_PROGRESS

    IntentProc->>+CustomerMCP: get_customer_profile()
    CustomerMCP-->>-IntentProc: Customer Profile

    IntentProc->>+PII: maskCustomerProfile()
    PII-->>-IntentProc: Masked Profile (✓ Valid)

    %% Claude AI Fails
    IntentProc->>+Claude: analyzeIntent(intent, maskedProfile)
    Claude->>Claude: Process request
    Claude->>Claude: ✗ ERROR: Rate limit exceeded<br/>HTTP 429 Too Many Requests
    Claude-->>-IntentProc: Error: API rate limit

    IntentProc->>+Metrics: intent_processing_failures_total{<br/>reason="claude_rate_limit"}++
    Metrics-->>-IntentProc: Metric recorded

    IntentProc->>+Logger: ERROR: Intent processing failed<br/>{intentId, error: "Claude rate limit",<br/>customerId, retryable: true}
    Logger-->>-IntentProc: Error log created

    IntentProc->>TMF921: Update lifecycleStatus = FAILED
    TMF921->>TMF921: Add IntentReport: "failed"<br/>reason: "External service error"
    IntentProc-->>-TMF921: Processing Failed

    Customer->>+API: GET /tmf-api/intentManagement/v5/intent/{id}
    API->>+TMF921: getIntent(id)
    TMF921-->>-API: Intent (lifecycleStatus: FAILED)
    API-->>-Customer: 200 OK<br/>{lifecycleStatus: FAILED,<br/>intentReport: [{reportState: "failed"}]}

    Note over Customer,API: Customer can retry<br/>by creating new intent
\`\`\`

---

## 5. Complete O2C with TMF921 Lifecycle

### PlantUML Diagram

\`\`\`plantuml
@startuml O2C_Complete_Lifecycle
autonumber
title Order-to-Cash E2E - Complete TMF921 Intent Lifecycle

actor "Customer/API Client" as Customer
participant "Business Intent Agent\n(Express API)" as API
participant "Authentication\nMiddleware" as Auth
participant "Rate Limiter" as RateLimit
participant "TMF921 Intent Service" as TMF921
participant "Intent Processor" as IntentProc
participant "PII Masking Service" as PII
participant "Customer Data MCP" as CustomerMCP
participant "Claude AI\n(Sonnet 4.5)" as Claude
participant "BSS/OSS MCP" as BSSMCP
participant "Knowledge Graph MCP" as KnowledgeMCP
participant "Response Filter\n(RBAC)" as ResponseFilter

== Phase 1: Authentication & Intent Creation ==

Customer -> API: POST /tmf-api/intentManagement/v5/intent\n{name: "Upgrade Mobile Plan",\ndescription: "I want to upgrade my mobile plan",\nintentType: "CUSTOMER_INTENT"}
activate API

API -> Auth: Authenticate API Key
activate Auth
Auth -> Auth: Validate Bearer Token
Auth -> Auth: Verify Customer Ownership
Auth --> API: ✓ Authenticated\n(customerId: CUST-001, role: customer)
deactivate Auth

API -> RateLimit: Check Rate Limit
activate RateLimit
RateLimit -> RateLimit: Verify: < 100 req/min per IP
RateLimit --> API: ✓ Within Limits
deactivate RateLimit

API -> TMF921: createIntent(intentCreate, customerId)
activate TMF921

TMF921 -> TMF921: Generate Intent ID (UUID)
TMF921 -> TMF921: **lifecycleStatus = ACKNOWLEDGED**
TMF921 -> TMF921: Add relatedParty (customer: CUST-001)
TMF921 -> TMF921: Store Intent in memory
TMF921 -> TMF921: Set creationDate, statusChangeDate

TMF921 --> API: Intent Created\n{id: "intent-uuid-123",\nlifecycleStatus: "ACKNOWLEDGED",\nhref: "/tmf-api/intentManagement/v5/intent/intent-uuid-123"}

API --> Customer: 201 Created\n{intent: {...},\nlifecycleStatus: "ACKNOWLEDGED"}
deactivate API

note over Customer,API
  Intent created immediately
  Processing happens asynchronously
end note

== Phase 2: Async Intent Processing (Background) ==

TMF921 -> IntentProc: processIntentAsync(intent, customerId)
activate IntentProc

IntentProc -> TMF921: Update lifecycleStatus = **IN_PROGRESS**
TMF921 -> TMF921: Set statusChangeDate
TMF921 -> TMF921: Add IntentReport:\n{reportState: "processing",\nreportValue: "Intent processing started"}

== Phase 3: Customer Profile Retrieval ==

IntentProc -> CustomerMCP: get_customer_profile(CUST-001)
activate CustomerMCP

CustomerMCP -> CustomerMCP: Query Customer Database
CustomerMCP -> CustomerMCP: Fetch profile, preferences, history

CustomerMCP --> IntentProc: Customer Profile\n{customerId: "CUST-001",\nname: "John Doe",\nemail: "john.doe@example.com",\nphone: "+353-1-234-5678",\nlocation: "123 Main St, Dublin, Ireland",\nsegment: "premium",\ncreditScore: "excellent",\nspending_tier: "high"}
deactivate CustomerMCP

== Phase 4: PII Masking (GDPR Compliance) ==

IntentProc -> PII: maskCustomerProfile(profile)
activate PII

PII -> PII: **Hash name**: SHA-256\nJohn Doe → name_a1b2c3d4e5f6789a
PII -> PII: **Remove email**: High-risk PII
PII -> PII: **Remove phone**: High-risk PII
PII -> PII: **Generalize location**:\n123 Main St, Dublin → Dublin, Ireland
PII -> PII: **Tier credit score**:\nexcellent → high
PII -> PII: **Preserve business data**:\nsegment, spending_tier

PII -> PII: validateNoRawPII(maskedProfile)
PII -> PII: ✓ No raw PII detected

PII --> IntentProc: Masked Profile (GDPR-compliant)\n{customer_id_hash: "name_a1b2c3d4e5f6789a",\nlocation: "Dublin, Ireland",\nsegment: "premium",\ncredit_tier: "high",\nspending_tier: "high"}
deactivate PII

note over PII
  **GDPR Article 32 Compliance**
  Raw PII never sent to external AI
  Masked data sufficient for intent analysis
end note

== Phase 5: AI Intent Analysis ==

IntentProc -> Claude: analyzeIntent(intent, maskedProfile)
activate Claude

note over Claude
  **Claude Sonnet 4.5**
  Analyzes: "I want to upgrade my mobile plan"
  Uses masked customer context
end note

Claude -> Claude: Parse natural language intent
Claude -> Claude: Extract intent tags:\n[mobile, upgrade, data, premium]
Claude -> Claude: Identify product types:\n[5G_PLAN, DATA_ADDON]
Claude -> Claude: Determine customer preferences\nbased on segment and tier
Claude -> Claude: Calculate confidence score: 0.95

Claude --> IntentProc: Intent Analysis\n{tags: ["mobile", "upgrade", "data"],\nproduct_types: ["5G_PLAN", "DATA_ADDON"],\nconfidence: 0.95,\nreasoning: "Customer seeks data-rich plan"}
deactivate Claude

== Phase 6: Product Catalog Search ==

IntentProc -> BSSMCP: search_product_catalog(\n{intent: ["mobile", "upgrade"],\ncustomer_segment: "premium"})
activate BSSMCP

BSSMCP -> BSSMCP: Query Product Catalog Database
BSSMCP -> BSSMCP: Filter by:\n- Intent tags (mobile, upgrade)\n- Segment eligibility (premium)\n- Active products only
BSSMCP -> BSSMCP: Rank by relevance score

BSSMCP --> IntentProc: Product Catalog Results\n[{id: "5G-UNLIMITED",\nname: "5G Unlimited Premium",\ndescription: "Unlimited 5G data + calls",\nprice: 49.99,\neligibility: ["premium", "vip"]},\n{id: "5G-STANDARD",\nname: "5G Standard 100GB",\nprice: 39.99}]
deactivate BSSMCP

== Phase 7: Bundle Discovery ==

IntentProc -> KnowledgeMCP: find_related_products(\n{base_products: ["5G_PLAN"]})
activate KnowledgeMCP

KnowledgeMCP -> KnowledgeMCP: Query Neo4j Graph Database:\nMATCH (p:Product {type: '5G_PLAN'})\n-[:BUNDLED_WITH]->(b:Bundle)\nRETURN b
KnowledgeMCP -> KnowledgeMCP: Traverse product relationships
KnowledgeMCP -> KnowledgeMCP: Find complementary products:\n- Streaming services (Netflix, Disney+)\n- Cloud storage\n- Device insurance

KnowledgeMCP --> IntentProc: Related Products/Bundles\n[{id: "PREMIUM-BUNDLE",\nname: "5G Premium + Streaming Bundle",\nincludes: ["5G-UNLIMITED", "NETFLIX", "DISNEY"],\ndiscount: 15%,\ntotal_value: 74.99,\nbundle_price: 63.74},\n{id: "5G-DEVICE-BUNDLE",\nincludes: ["5G-UNLIMITED", "DEVICE-INSURANCE"]}]
deactivate KnowledgeMCP

== Phase 8: AI-Powered Offer Generation ==

IntentProc -> Claude: generateOffer(\n{intent: analysis,\ncustomer: maskedProfile,\nproducts: catalogResults,\nbundles: relatedProducts})
activate Claude

note over Claude
  **Personalized Offer Generation**
  AI considers:
  - Customer segment (premium)
  - Spending tier (high)
  - Product availability
  - Bundle opportunities
  - Discount eligibility
end note

Claude -> Claude: Analyze customer preferences
Claude -> Claude: Match products to intent
Claude -> Claude: Optimize bundle selection
Claude -> Claude: Calculate discount eligibility:\n- Loyalty discount: 10%\n- Premium tier bonus: 5%
Claude -> Claude: Generate offer narrative

Claude --> IntentProc: Personalized Offer\n{name: "Premium 5G Complete Bundle",\nselected_products: [\n  "5G-UNLIMITED",\n  "NETFLIX",\n  "DISNEY"\n],\nrecommended_discounts: [\n  {type: "loyalty", value: 10%},\n  {type: "premium_tier", value: 5%}\n],\nnarrative: "Perfect for streaming on-the-go"}
deactivate Claude

== Phase 9: Quote Generation (Order) ==

IntentProc -> BSSMCP: generate_quote(\n{customer_id: "CUST-001",\nproducts: ["5G-UNLIMITED", "NETFLIX", "DISNEY"],\ndiscounts: [{type: "loyalty", value: 10%}]})
activate BSSMCP

BSSMCP -> BSSMCP: Calculate base pricing:\n- 5G-UNLIMITED: 49.99\n- NETFLIX: 12.99\n- DISNEY+: 9.99\nSubtotal: 72.97
BSSMCP -> BSSMCP: Apply bundle discount: -15%\nAfter bundle: 62.02
BSSMCP -> BSSMCP: Apply loyalty discount: -10%\nFinal total: 55.82
BSSMCP -> BSSMCP: Generate quote ID: Q-12345
BSSMCP -> BSSMCP: Set validity period: 7 days

BSSMCP --> IntentProc: Quote/Order\n{quote_id: "Q-12345",\ntotal_monthly: 55.82,\ndiscount_applied: 17.15,\nproducts: [...],\nvalid_until: "2026-01-17T15:00:00Z",\nterms: "Subject to credit check"}
deactivate BSSMCP

== Phase 10: Intent Completion ==

IntentProc -> TMF921: Update lifecycleStatus = **COMPLETED**
TMF921 -> TMF921: Set statusChangeDate
TMF921 -> TMF921: Add IntentReport:\n{reportState: "completed",\nreportValue: JSON.stringify({\n  offer: "Premium 5G Complete Bundle",\n  products: ["5G-UNLIMITED", "NETFLIX", "DISNEY"],\n  quote: "Q-12345"\n})}

IntentProc --> TMF921: Processing Complete
deactivate IntentProc
deactivate TMF921

note over TMF921
  Intent lifecycle complete:
  ACKNOWLEDGED → IN_PROGRESS → COMPLETED
  Total processing time: ~2-3 seconds
end note

== Phase 11: Customer Retrieves Result ==

Customer -> API: GET /tmf-api/intentManagement/v5/intent/intent-uuid-123
activate API

API -> TMF921: getIntent("intent-uuid-123")
activate TMF921

TMF921 -> TMF921: Retrieve Intent from store
TMF921 --> API: Intent\n{id: "intent-uuid-123",\nlifecycleStatus: "COMPLETED",\nintentReport: [...],\nlastUpdate: "2026-01-10T15:20:00Z"}
deactivate TMF921

API -> ResponseFilter: Filter response by customer role
activate ResponseFilter

ResponseFilter -> ResponseFilter: Apply RBAC field-level filtering:\n- Customer role: Redact internal fields\n- Mask sensitive data\n- Remove debug information
ResponseFilter -> ResponseFilter: Remove fields:\n- email, phone (already masked)\n- Internal timestamps\n- Processing metrics

ResponseFilter --> API: Filtered Response\n(Customer-appropriate data only)
deactivate ResponseFilter

API --> Customer: 200 OK\n{intent: {...},\nlifecycleStatus: "COMPLETED",\noffer: {\n  name: "Premium 5G Complete Bundle",\n  products: ["5G-UNLIMITED", "NETFLIX", "DISNEY"],\n  monthly_price: 55.82,\n  savings: 17.15\n},\nquote: {\n  quote_id: "Q-12345",\n  valid_until: "2026-01-17"\n}}
deactivate API

note over Customer,API
  **Order-to-Cash Complete!**
  Customer can now:
  1. Review personalized offer
  2. Accept quote Q-12345
  3. Proceed to payment/checkout
  4. Activate services

  Total E2E time: ~3 seconds
  (API responds in <200ms,
  processing completes in 2-3s)
end note

@enduml
\`\`\`

---

## Data Flow Summary

### Input (Customer → System)
\`\`\`json
POST /tmf-api/intentManagement/v5/intent
{
  "name": "Upgrade Mobile Plan",
  "description": "I want to upgrade my mobile plan",
  "intentType": "CUSTOMER_INTENT",
  "priority": 5
}
\`\`\`

### Output (System → Customer)
\`\`\`json
{
  "intent": {
    "id": "intent-uuid-123",
    "lifecycleStatus": "COMPLETED",
    "name": "Upgrade Mobile Plan",
    "creationDate": "2026-01-10T15:18:00Z",
    "lastUpdate": "2026-01-10T15:20:00Z"
  },
  "offer": {
    "name": "Premium 5G Complete Bundle",
    "selected_products": [
      "5G-UNLIMITED",
      "NETFLIX",
      "DISNEY+"
    ],
    "monthly_price": 55.82,
    "original_price": 72.97,
    "savings": 17.15,
    "discount_percentage": 23.5
  },
  "quote": {
    "quote_id": "Q-12345",
    "status": "active",
    "valid_until": "2026-01-17T15:00:00Z",
    "products": [
      {
        "id": "5G-UNLIMITED",
        "name": "5G Unlimited Premium",
        "price": 49.99
      },
      {
        "id": "NETFLIX",
        "name": "Netflix Premium",
        "price": 12.99
      },
      {
        "id": "DISNEY",
        "name": "Disney+ Subscription",
        "price": 9.99
      }
    ],
    "total_monthly": 55.82
  }
}
\`\`\`

---

## Performance Metrics

| Metric | Target | Typical |
|--------|--------|---------|
| **API Response Time** | < 200ms | 150ms |
| **Intent Creation** | < 100ms | 75ms |
| **Async Processing** | < 5s | 2-3s |
| **Customer Profile Fetch** | < 500ms | 300ms |
| **PII Masking** | < 50ms | 25ms |
| **Claude AI Analysis** | < 2s | 1.5s |
| **Product Catalog Search** | < 500ms | 200ms |
| **Bundle Discovery** | < 300ms | 150ms |
| **Quote Generation** | < 500ms | 250ms |
| **Total E2E (async)** | < 5s | 2.8s |

---

## Security & Compliance

### GDPR Compliance (Article 32)
- ✅ **PII Masking**: All personal data masked before external AI processing
- ✅ **Data Minimization**: Only necessary data sent to Claude AI
- ✅ **Audit Logging**: All PII operations logged
- ✅ **Validation**: Automated checks prevent raw PII leakage

### TMF921 Compliance
- ✅ **Lifecycle Management**: ACKNOWLEDGED → IN_PROGRESS → COMPLETED/FAILED
- ✅ **Intent Reports**: Timestamped status updates
- ✅ **Related Parties**: Customer ownership tracked
- ✅ **REST API**: Full CRUD operations

### Authentication & Authorization
- ✅ **API Key Authentication**: Bearer token required
- ✅ **Customer Ownership**: Validated per request
- ✅ **Rate Limiting**: 100 req/min per IP
- ✅ **RBAC**: Role-based response filtering

---

## Error Handling

| Error Code | Scenario | Action |
|------------|----------|--------|
| **401** | Invalid API key | Re-authenticate |
| **403** | Insufficient permissions | Check customer ownership |
| **429** | Rate limit exceeded | Wait and retry |
| **400** | PII validation failed | Fix data masking |
| **500** | Claude AI error | Intent status = FAILED, retry |
| **503** | MCP service down | Intent status = FAILED, retry |

---

## Next Steps After O2C

Once the quote is generated, the customer can:

1. **Review Offer**: Display personalized offer and pricing
2. **Accept Quote**: POST to /tmf-api/quoteManagement/v5/quote/{id}/accept
3. **Payment**: Proceed to payment gateway
4. **Order Activation**: Create order in fulfillment system
5. **Service Provisioning**: Activate services (5G plan, streaming)
6. **Confirmation**: Send confirmation email/SMS

---

## Architecture Decisions

### Why Async Processing?
- **Fast API Response**: Return 201 Created immediately (<200ms)
- **Long-Running Operations**: AI analysis takes 2-3 seconds
- **Better UX**: Customer can poll for status or use webhooks

### Why TMF921?
- **Industry Standard**: TM Forum standard for telecom
- **Interoperability**: Compatible with other TMF APIs
- **Lifecycle Management**: Proper intent tracking
- **Vendor Neutral**: Not tied to specific implementation

### Why PII Masking?
- **GDPR Compliance**: Required by Article 32
- **Data Minimization**: Claude AI doesn't need raw PII
- **Risk Reduction**: €20M fine avoidance
- **Customer Trust**: Demonstrates data protection

---

## Related Documentation

- **API Documentation**: `/src/API_AUTHENTICATION.md`
- **PII Masking**: `/src/PII_MASKING.md`
- **Security Policy**: `/SECURITY.md`
- **TMF921 Spec**: https://www.tmforum.org/resources/specification/tmf921-intent-management-api-v5-0-0/
- **Architecture**: `/README.md`

---

**Document Version:** 1.0
**Last Updated:** January 10, 2026
**Status:** Production Ready
**Author:** Business Intent Agent Team
