# Agent-to-Agent (A2A) Architecture Proposal

## Overview

This document proposes evolving the Intent Processing Platform from a single-orchestrator model to a **multi-agent architecture** where specialized AI agents communicate directly with each other to collaboratively solve customer intent problems.

## Current vs Proposed Architecture

### Current: Single Orchestrator Model
```
Client → IntentProcessor → [MCP Services] → Claude LLM → Response
```
- Single point of orchestration
- Sequential processing
- LLM used for reasoning, MCP for data

### Proposed: Multi-Agent Collaborative Model
```
Client → Coordinator Agent ↔ [Specialist Agents] ↔ [Tool Agents] → Response
                    ↕              ↕                    ↕
              Agent Registry    A2A Protocol        MCP Services
```
- Distributed intelligence
- Parallel agent collaboration
- Each agent has specialized capabilities

---

## Agent Architecture

### Agent Types

```mermaid
flowchart TB
    subgraph "Coordinator Layer"
        CA[Coordinator Agent]
    end

    subgraph "Specialist Agents"
        IA[Intent Analyst Agent]
        PA[Personalization Agent]
        CA2[Compliance Agent]
        NA[Negotiation Agent]
    end

    subgraph "Tool Agents"
        CDA[Customer Data Agent]
        PCA[Product Catalog Agent]
        KGA[Knowledge Graph Agent]
        QA[Quoting Agent]
    end

    subgraph "Infrastructure"
        AR[(Agent Registry)]
        MQ[Message Queue]
        SS[(Shared State)]
    end

    CA <-->|A2A Protocol| IA
    CA <-->|A2A Protocol| PA
    CA <-->|A2A Protocol| CA2
    CA <-->|A2A Protocol| NA

    IA <-->|A2A Protocol| CDA
    IA <-->|A2A Protocol| PCA
    PA <-->|A2A Protocol| KGA
    PA <-->|A2A Protocol| PCA
    NA <-->|A2A Protocol| QA

    CA --- AR
    CA --- MQ
    CA --- SS
```

### Agent Descriptions

| Agent | Role | Capabilities | LLM Powered |
|-------|------|--------------|-------------|
| **Coordinator Agent** | Orchestrates multi-agent workflows | Task decomposition, agent selection, result aggregation | Yes |
| **Intent Analyst Agent** | Understands customer needs | NLU, intent classification, entity extraction | Yes |
| **Personalization Agent** | Tailors recommendations | Customer profiling, preference learning, offer optimization | Yes |
| **Compliance Agent** | Ensures regulatory compliance | GDPR validation, PII detection, audit logging | Yes |
| **Negotiation Agent** | Handles pricing and discounts | Dynamic pricing, discount rules, approval workflows | Yes |
| **Customer Data Agent** | Retrieves customer information | CRM integration, profile aggregation | No (Tool) |
| **Product Catalog Agent** | Searches products | Catalog search, availability check | No (Tool) |
| **Knowledge Graph Agent** | Discovers relationships | RDF/SPARQL queries, bundle discovery | No (Tool) |
| **Quoting Agent** | Generates quotes | Price calculation, quote generation | No (Tool) |

---

## A2A Communication Protocol

### Message Format

```typescript
interface A2AMessage {
  // Header
  messageId: string;
  correlationId: string;      // Links related messages
  timestamp: string;

  // Routing
  from: AgentIdentity;
  to: AgentIdentity;
  replyTo?: string;           // For async responses

  // Payload
  type: 'request' | 'response' | 'event' | 'error';
  intent: string;             // What the sender wants
  content: any;               // Structured payload

  // Context
  conversationId: string;     // Multi-turn context
  parentMessageId?: string;   // For threaded conversations
  context: SharedContext;     // Accumulated state

  // Metadata
  priority: 'low' | 'normal' | 'high' | 'critical';
  ttl: number;                // Time to live in ms
  capabilities: string[];     // Required agent capabilities
}

interface AgentIdentity {
  agentId: string;
  agentType: string;
  version: string;
  endpoint: string;
}

interface SharedContext {
  customerId?: string;
  sessionId: string;
  accumulatedFacts: Record<string, any>;
  decisions: Decision[];
  constraints: Constraint[];
}
```

### Agent Card (Discovery)

Each agent publishes an **Agent Card** for discovery:

```json
{
  "agentId": "intent-analyst-001",
  "name": "Intent Analyst Agent",
  "description": "Analyzes customer intents using NLU",
  "version": "2.0.0",
  "capabilities": [
    "intent_classification",
    "entity_extraction",
    "sentiment_analysis",
    "multi_turn_context"
  ],
  "protocols": ["a2a/1.0", "mcp/1.0"],
  "endpoint": "https://agents.internal/intent-analyst",
  "authentication": {
    "type": "oauth2",
    "tokenUrl": "https://auth.internal/token"
  },
  "rateLimit": {
    "requestsPerMinute": 100,
    "maxConcurrent": 10
  },
  "sla": {
    "maxLatencyMs": 500,
    "availability": 99.9
  }
}
```

---

## Sequence Diagram: Multi-Agent Intent Processing

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Coord as Coordinator Agent
    participant Intent as Intent Analyst
    participant Comply as Compliance Agent
    participant Pers as Personalization Agent
    participant Neg as Negotiation Agent
    participant CDA as Customer Data Agent
    participant KGA as Knowledge Graph Agent
    participant QA as Quoting Agent

    Client->>Coord: ProcessIntent(customerId, text)

    Note over Coord: Decompose task into sub-goals

    par Parallel Agent Invocation
        Coord->>Intent: AnalyzeIntent(text)
        Coord->>CDA: GetCustomerProfile(customerId)
    end

    CDA-->>Coord: CustomerProfile
    Coord->>Comply: ValidatePII(profile)
    Comply-->>Coord: MaskedProfile + ComplianceReport

    Intent-->>Coord: IntentAnalysis(tags, entities, confidence)

    Note over Coord: Share context with specialists

    Coord->>Pers: GenerateRecommendations(intent, maskedProfile)

    par Personalization queries tools
        Pers->>KGA: FindBundles(productTypes)
        KGA-->>Pers: Bundles with RDF relationships
    end

    Pers-->>Coord: PersonalizedRecommendations

    Coord->>Neg: NegotiateOffer(recommendations, customerSegment)

    par Negotiation with quoting
        Neg->>QA: CalculatePricing(products, discounts)
        QA-->>Neg: PricingDetails
    end

    Neg-->>Coord: FinalOffer(products, pricing, terms)

    Coord->>Comply: AuditLog(fullTransaction)
    Comply-->>Coord: AuditConfirmation

    Coord-->>Client: CompleteResponse(offer, quote, audit)
```

---

## C4 Container Diagram: A2A Architecture

```mermaid
C4Container
    title Container Diagram - Agent-to-Agent Architecture

    Person(user, "User", "Customer or Sales Agent")

    System_Boundary(platform, "Intent Processing Platform") {
        Container(gateway, "API Gateway", "Express.js", "REST/WebSocket API")
        Container(coord, "Coordinator Agent", "Claude + TypeScript", "Task decomposition and orchestration")

        Container_Boundary(specialists, "Specialist Agents") {
            Container(intent, "Intent Analyst", "Claude + TypeScript", "NLU and intent classification")
            Container(pers, "Personalization Agent", "Claude + TypeScript", "Recommendation engine")
            Container(comply, "Compliance Agent", "Claude + TypeScript", "GDPR and audit")
            Container(neg, "Negotiation Agent", "Claude + TypeScript", "Pricing optimization")
        }

        Container_Boundary(tools, "Tool Agents") {
            Container(cda, "Customer Data Agent", "TypeScript", "CRM integration")
            Container(pca, "Product Catalog Agent", "TypeScript", "BSS integration")
            Container(kga, "Knowledge Graph Agent", "TypeScript", "Neo4j/RDF queries")
            Container(qa, "Quoting Agent", "TypeScript", "Price calculation")
        }

        ContainerDb(registry, "Agent Registry", "Redis", "Agent discovery and health")
        ContainerDb(state, "Shared State", "Redis", "Conversation context")
        Container(mq, "Message Broker", "NATS", "A2A message routing")
    }

    System_Ext(claude, "Claude API", "Anthropic LLM")
    System_Ext(neo4j, "Neo4j", "Knowledge Graph")
    System_Ext(crm, "CRM System", "Customer data")
    System_Ext(bss, "BSS/OSS", "Product catalog")

    Rel(user, gateway, "HTTP/WebSocket")
    Rel(gateway, coord, "A2A Protocol")
    Rel(coord, mq, "Pub/Sub")
    Rel(mq, intent, "A2A Messages")
    Rel(mq, pers, "A2A Messages")
    Rel(mq, comply, "A2A Messages")
    Rel(mq, neg, "A2A Messages")

    Rel(intent, claude, "LLM API")
    Rel(pers, claude, "LLM API")
    Rel(comply, claude, "LLM API")
    Rel(neg, claude, "LLM API")

    Rel(cda, crm, "REST API")
    Rel(pca, bss, "MCP Protocol")
    Rel(kga, neo4j, "Cypher/SPARQL")
    Rel(qa, bss, "MCP Protocol")

    Rel(coord, registry, "Discovery")
    Rel(coord, state, "Context")
```

---

## Data Flow: Agent Collaboration

```mermaid
flowchart LR
    subgraph "Input"
        REQ["Customer Request"]
    end

    subgraph "Coordinator"
        DECOMP["Task Decomposition"]
        AGG["Result Aggregation"]
    end

    subgraph "Analysis Phase"
        IA["Intent Analyst"]
        CA["Compliance Agent"]
    end

    subgraph "Enrichment Phase"
        CDA["Customer Data"]
        KGA["Knowledge Graph"]
    end

    subgraph "Recommendation Phase"
        PA["Personalization"]
        NA["Negotiation"]
    end

    subgraph "Output"
        RESP["Final Response"]
    end

    REQ --> DECOMP
    DECOMP -->|"Analyze"| IA
    DECOMP -->|"Fetch Profile"| CDA

    CDA -->|"Profile"| CA
    CA -->|"Masked Profile"| PA

    IA -->|"Intent Tags"| PA
    PA -->|"Query Bundles"| KGA
    KGA -->|"RDF Bundles"| PA

    PA -->|"Recommendations"| NA
    NA -->|"Priced Offer"| AGG

    AGG --> RESP

    style IA fill:#90EE90
    style PA fill:#90EE90
    style CA fill:#FFE4B5
    style NA fill:#90EE90
    style CDA fill:#ADD8E6
    style KGA fill:#DDA0DD
```

---

## Agent Communication Patterns

### 1. Request-Response (Synchronous)

```typescript
// Coordinator requests intent analysis
const response = await intentAgent.send({
  type: 'request',
  intent: 'analyze_customer_intent',
  content: {
    text: 'Need fast internet for working from home',
    context: sharedContext
  }
});
```

### 2. Publish-Subscribe (Async Events)

```typescript
// Compliance agent publishes audit event
await messageBroker.publish('audit.completed', {
  type: 'event',
  intent: 'audit_logged',
  content: {
    transactionId: 'TXN-123',
    complianceStatus: 'passed',
    timestamp: new Date().toISOString()
  }
});
```

### 3. Task Delegation Chain

```typescript
// Coordinator delegates with continuation
const workflow = new AgentWorkflow()
  .step(intentAgent, 'analyze')
  .step(complianceAgent, 'validate')
  .parallel([
    [personalizationAgent, 'recommend'],
    [knowledgeGraphAgent, 'findBundles']
  ])
  .step(negotiationAgent, 'price')
  .aggregate(coordinatorAgent, 'finalize');

const result = await workflow.execute(customerRequest);
```

### 4. Consensus Protocol (Multi-Agent Agreement)

```typescript
// Multiple agents vote on recommendation
const consensus = await coordinatorAgent.seekConsensus({
  question: 'Best bundle for customer segment: Young Professional',
  voters: [personalizationAgent, negotiationAgent, complianceAgent],
  threshold: 0.66,  // 2/3 majority
  timeout: 5000
});
```

---

## Benefits of A2A Architecture

| Aspect | Single Orchestrator | Multi-Agent A2A |
|--------|---------------------|-----------------|
| **Scalability** | Limited by orchestrator | Horizontal scaling per agent |
| **Specialization** | General-purpose prompts | Domain-expert agents |
| **Fault Tolerance** | Single point of failure | Graceful degradation |
| **Latency** | Sequential processing | Parallel agent execution |
| **Maintainability** | Monolithic prompts | Modular agent updates |
| **Observability** | Single trace | Per-agent metrics |
| **Cost Optimization** | One LLM for all | Right-sized LLMs per agent |

---

## Implementation Roadmap

### Phase 1: Agent Framework (Week 1-2)
- [ ] Define A2A message protocol
- [ ] Implement Agent base class
- [ ] Create Agent Registry service
- [ ] Set up NATS message broker

### Phase 2: Core Agents (Week 3-4)
- [ ] Migrate IntentProcessor to Coordinator Agent
- [ ] Extract Intent Analyst Agent
- [ ] Extract Compliance Agent
- [ ] Implement shared context store

### Phase 3: Specialist Agents (Week 5-6)
- [ ] Implement Personalization Agent
- [ ] Implement Negotiation Agent
- [ ] Add agent-to-agent discovery
- [ ] Implement workflow engine

### Phase 4: Tool Agent Migration (Week 7-8)
- [ ] Wrap MCP services as Tool Agents
- [ ] Add MCP-to-A2A bridge
- [ ] Implement circuit breakers
- [ ] Add agent health monitoring

### Phase 5: Production Hardening (Week 9-10)
- [ ] Distributed tracing (Jaeger)
- [ ] Agent metrics (Prometheus)
- [ ] Chaos testing
- [ ] Performance optimization

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Message Broker | NATS JetStream | A2A message routing with persistence |
| Agent Registry | Redis + etcd | Service discovery and leader election |
| Shared State | Redis Cluster | Conversation context and caching |
| LLM Gateway | Claude API | Specialist agent reasoning |
| Tracing | Jaeger | Distributed request tracing |
| Metrics | Prometheus + Grafana | Agent performance monitoring |
| Container Runtime | Kubernetes | Agent deployment and scaling |

---

## Security Considerations

### Agent Authentication
- Each agent has a unique identity certificate
- mTLS for all A2A communication
- JWT tokens for LLM API calls

### Message Security
- All A2A messages signed and encrypted
- PII never leaves Compliance Agent boundary
- Audit trail for all agent decisions

### Access Control
- Role-based agent permissions
- Capability-based message filtering
- Rate limiting per agent pair

---

## Next Steps

1. **Review this proposal** with the team
2. **Prototype** the Coordinator and Intent Analyst agents
3. **Benchmark** A2A latency vs current architecture
4. **Define** agent SLAs and contracts
5. **Plan** migration strategy from current system
