# LLM Agentic MCP - C4 Architecture Diagram

This C4 diagram shows the system context and container architecture for the LLM Agentic MCP integration.

## System Context Diagram (C4 Level 1)

```mermaid
C4Context
    title System Context - LLM Agentic MCP Platform

    Person(customer, "Customer", "End user requesting telecom services")
    Person(agent, "Sales Agent", "Human agent using the platform")

    System(intentPlatform, "Intent Processing Platform", "AI-powered business intent processor that orchestrates LLM and MCP services")

    System_Ext(anthropic, "Anthropic Claude API", "Large Language Model for intent analysis and offer generation")
    System_Ext(bssOss, "BSS/OSS Systems", "Legacy billing and operational support systems")
    System_Ext(customerDb, "Customer Database", "CRM and customer profile storage")
    System_Ext(productCatalog, "Product Catalog", "Telecom product and pricing database")

    Rel(customer, intentPlatform, "Submits intent", "REST API")
    Rel(agent, intentPlatform, "Processes requests", "Web UI")
    Rel(intentPlatform, anthropic, "Analyzes intent, generates offers", "HTTPS/JSON")
    Rel(intentPlatform, bssOss, "Searches products, generates quotes", "MCP Protocol")
    Rel(intentPlatform, customerDb, "Retrieves profiles", "MCP Protocol")
    Rel(intentPlatform, productCatalog, "Queries relationships", "MCP Protocol + SPARQL")
```

## Container Diagram (C4 Level 2)

```mermaid
C4Container
    title Container Diagram - Intent Processing Platform

    Person(user, "User", "Customer or Sales Agent")

    System_Boundary(platform, "Intent Processing Platform") {
        Container(api, "API Gateway", "Express.js", "REST API endpoints with rate limiting and auth")
        Container(processor, "Intent Processor", "TypeScript", "Orchestrates LLM and MCP calls")
        Container(piiMask, "PII Masking Service", "TypeScript", "GDPR-compliant data anonymization")
        Container(claudeClient, "Claude Client", "TypeScript", "Anthropic SDK wrapper")
        Container(mcpClient, "MCP Client", "TypeScript", "Model Context Protocol HTTP client")
        ContainerDb(redis, "Redis Cache", "Redis", "Session and response caching")
    }

    System_Boundary(mcp, "MCP Services Layer") {
        Container(customerMcp, "Customer Data MCP", "Node.js", "Customer profile retrieval")
        Container(bssMcp, "BSS/OSS MCP", "Node.js", "Product catalog and quoting")
        Container(kgMcp, "Knowledge Graph MCP", "Node.js + Neo4j", "RDF/SPARQL product relationships")
    }

    System_Ext(claude, "Claude API", "Anthropic LLM")
    System_Ext(neo4j, "Neo4j Graph DB", "Knowledge graph storage")

    Rel(user, api, "HTTP/REST", "JSON")
    Rel(api, processor, "Invokes", "Internal")
    Rel(processor, piiMask, "Masks PII", "Internal")
    Rel(processor, claudeClient, "LLM calls", "Internal")
    Rel(processor, mcpClient, "MCP calls", "Internal")
    Rel(processor, redis, "Caches", "Redis Protocol")

    Rel(claudeClient, claude, "API calls", "HTTPS")
    Rel(mcpClient, customerMcp, "get_customer_profile", "HTTP/MCP")
    Rel(mcpClient, bssMcp, "search_product_catalog, generate_quote", "HTTP/MCP")
    Rel(mcpClient, kgMcp, "find_related_products", "HTTP/MCP")
    Rel(kgMcp, neo4j, "SPARQL/Cypher", "Bolt")
```

## Component Diagram (C4 Level 3) - Intent Processor

```mermaid
C4Component
    title Component Diagram - Intent Processor

    Container_Boundary(processor, "Intent Processor") {
        Component(orchestrator, "Orchestrator", "IntentProcessor class", "Coordinates the E2E flow")
        Component(intentAnalyzer, "Intent Analyzer", "ClaudeClient.analyzeIntent", "Extracts tags and product types from natural language")
        Component(offerGenerator, "Offer Generator", "ClaudeClient.generateOffer", "Creates personalized recommendations")
        Component(productSearch, "Product Search", "MCPClient", "Queries BSS for matching products")
        Component(bundleFinder, "Bundle Finder", "MCPClient", "Queries Knowledge Graph for relationships")
        Component(quoteGen, "Quote Generator", "MCPClient", "Creates pricing quotes")
        Component(piiHandler, "PII Handler", "PII Masking module", "Anonymizes sensitive data")
    }

    System_Ext(claude, "Claude LLM", "Anthropic API")
    System_Ext(bss, "BSS MCP", "Product/Quote service")
    System_Ext(kg, "Knowledge Graph MCP", "RDF relationships")
    System_Ext(cust, "Customer MCP", "Profile service")

    Rel(orchestrator, piiHandler, "1. Mask profile")
    Rel(orchestrator, intentAnalyzer, "2. Analyze intent")
    Rel(orchestrator, productSearch, "3. Search products")
    Rel(orchestrator, bundleFinder, "4. Find bundles")
    Rel(orchestrator, offerGenerator, "5. Generate offer")
    Rel(orchestrator, quoteGen, "6. Create quote")

    Rel(intentAnalyzer, claude, "LLM Call")
    Rel(offerGenerator, claude, "LLM Call")
    Rel(productSearch, bss, "MCP Call")
    Rel(bundleFinder, kg, "MCP Call")
    Rel(quoteGen, bss, "MCP Call")
```

## Data Flow Diagram

```mermaid
flowchart TB
    subgraph Input
        A["Customer Intent: Need internet for WFH"]
        B["Customer ID: CUST-123"]
    end

    subgraph "MCP Layer"
        C[(Customer Data MCP)]
        D[(BSS/OSS MCP)]
        E[(Knowledge Graph MCP)]
    end

    subgraph "LLM Layer"
        F{{Claude LLM}}
    end

    subgraph "Processing"
        G[PII Masking]
        H[Intent Processor]
    end

    subgraph Output
        I[Personalized Offer]
        J[Quote QT-2024-001]
    end

    A --> H
    B --> H
    H -->|1. get_customer_profile| C
    C -->|profile| G
    G -->|masked profile| H
    H -->|2. analyzeIntent| F
    F -->|tags, product_types| H
    H -->|3. search_product_catalog| D
    D -->|products| H
    H -->|4. find_related_products| E
    E -->|bundles + RDF URIs| H
    H -->|5. generateOffer| F
    F -->|selected_products| H
    H -->|6. generate_quote| D
    D -->|quote| H
    H --> I
    H --> J

    style F fill:#90EE90
    style C fill:#ADD8E6
    style D fill:#ADD8E6
    style E fill:#DDA0DD
    style G fill:#FFE4B5
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| API | Express.js 5.x | REST endpoints |
| Orchestration | TypeScript | Intent processing logic |
| LLM | Anthropic Claude | Intent analysis, offer generation |
| MCP Protocol | @modelcontextprotocol/sdk | Tool invocation |
| Knowledge Graph | Neo4j + RDF | Product relationships |
| Caching | Redis | Response caching |
| Observability | Pino + Prometheus | Logging and metrics |
