# LLM Agentic MCP - Sequence Diagram

This diagram shows the end-to-end flow of an LLM invoking Agentic MCP services to process a customer intent.

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant IP as IntentProcessor
    participant CDM as Customer Data MCP
    participant PII as PII Masking
    participant Claude as Claude LLM
    participant BSS as BSS/OSS MCP
    participant KG as Knowledge Graph MCP

    Client->>IP: process(customerId, intent)
    Note over Client,IP: "CUST-123", "Need internet for WFH"

    %% Step 1: Get Customer Profile
    rect rgb(240, 248, 255)
        Note over IP,CDM: Step 1: Fetch Customer Data
        IP->>CDM: get_customer_profile({customer_id})
        CDM-->>IP: {customer_id, segment, name, email, preferences}
    end

    %% Step 2: PII Masking
    rect rgb(255, 250, 240)
        Note over IP,PII: Step 2: GDPR Compliance
        IP->>PII: maskCustomerProfile(profile)
        PII-->>IP: {masked_name, segment, preferences}
        Note over PII: Masked name, Removed email
    end

    %% Step 3: Analyze Intent with LLM
    rect rgb(240, 255, 240)
        Note over IP,Claude: Step 3: LLM Intent Analysis
        IP->>Claude: analyzeIntent(intent, maskedProfile)
        Note over Claude: Reasoning about customer needs
        Claude-->>IP: {tags, product_types, confidence: 0.92}
    end

    %% Step 4: Search Products
    rect rgb(240, 248, 255)
        Note over IP,BSS: Step 4: Product Catalog Search
        IP->>BSS: search_product_catalog({intent, segment})
        BSS-->>IP: [Fiber Pro 500Mbps, Mobile Unlimited Plus]
    end

    %% Step 5: Find Bundles
    rect rgb(255, 240, 245)
        Note over IP,KG: Step 5: Knowledge Graph Query
        IP->>KG: find_related_products({base_products})
        Note over KG: RDF/SPARQL Query - Semantic relationships
        KG-->>IP: [{bundle_id, rdf_uri, discount_percent}]
    end

    %% Step 6: Generate Offer with LLM
    rect rgb(240, 255, 240)
        Note over IP,Claude: Step 6: LLM Offer Generation
        IP->>Claude: generateOffer({intent, customer, products, bundles})
        Note over Claude: Personalization reasoning
        Claude-->>IP: {selected_products, recommended_discounts}
    end

    %% Step 7: Generate Quote
    rect rgb(240, 248, 255)
        Note over IP,BSS: Step 7: Quote Generation
        IP->>BSS: generate_quote({customer_id, products, discounts})
        BSS-->>IP: {quote_id, final_monthly: $109.98}
    end

    IP-->>Client: {intent_analysis, offer, quote, processing_time}
    Note over Client,IP: Complete response with personalized offer
```

## Flow Summary

| Step | Component | Action | Purpose |
|------|-----------|--------|---------|
| 1 | Customer Data MCP | get_customer_profile | Retrieve customer context |
| 2 | PII Masking | maskCustomerProfile | GDPR compliance |
| 3 | Claude LLM | analyzeIntent | Understand customer needs |
| 4 | BSS MCP | search_product_catalog | Find matching products |
| 5 | Knowledge Graph MCP | find_related_products | Discover bundles via RDF |
| 6 | Claude LLM | generateOffer | Personalize recommendation |
| 7 | BSS MCP | generate_quote | Create pricing quote |
