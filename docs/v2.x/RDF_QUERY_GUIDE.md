# RDF Query Guide for Knowledge Graph MCP

**Version:** 2.x Standards Compliance
**Date:** January 10, 2026
**Status:** Phase 2 Complete

---

## Overview

This guide documents how to query the RDF-compliant product catalog in Neo4j using Cypher queries. These queries should be used to update the Knowledge Graph MCP service to support semantic/standards-compliant queries.

---

## RDF Data Model Structure

### Node Labels

All RDF products have multiple labels:
- `:Resource` - Base RDF resource label
- `:sch__Product` - Schema.org Product type
- `:tmf620__ProductOffering` - TM Forum TMF620 ProductOffering type

### Key Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `uri` | String | Unique RDF URI | `https://intent-platform.example.com/product/PROD-BB-500` |
| `sch__name` | String | Product name (Schema.org) | `"Broadband 500Mbps"` |
| `sch__identifier` | String | Product identifier | `"PROD-BB-500"` |
| `sch__description` | String | Product description | `"High-speed broadband..."` |
| `tmf620__productOfferingId` | String | TMF620 product ID | `"PROD-BB-500"` |
| `tmf620__productOfferingType` | String | Product type (TMF620) | `"broadband"`, `"mobile"`, `"tv"` |
| `tmf620__lifecycleStatus` | String | Lifecycle status | `"Active"`, `"Deprecated"` |
| `intent__popularityScore` | Integer | AI popularity score (0-100) | `85` |
| `intent__aiRecommendationWeight` | Float | AI recommendation weight (0-1) | `0.8` |
| `intent__customerSegment` | String | Target customer segment | `"premium"`, `"standard"`, `"basic"` |
| `intent__priceAmount` | Float | Price value | `39.99` |
| `intent__priceCurrency` | String | Currency code | `"EUR"` |

### Relationships

| Relationship | Direction | Description |
|--------------|-----------|-------------|
| `:sch__isRelatedTo` | → | Schema.org related product |
| `:intent__complementsProduct` | → | Products that complement each other |
| `:intent__frequentlyBundledWith` | → | Products frequently bundled together |
| `:intent__upgradesTo` | → | Upgrade path to higher-tier product |

---

## Common Query Patterns

### 1. Find All RDF Products

```cypher
MATCH (p:Resource:sch__Product)
RETURN p.uri AS uri,
       p.sch__name AS name,
       p.tmf620__productOfferingType AS type,
       p.intent__priceAmount AS price,
       p.intent__priceCurrency AS currency,
       p.intent__popularityScore AS popularity
ORDER BY p.intent__popularityScore DESC
```

**Expected Result:** 6 products (2 broadband, 2 mobile, 2 TV)

---

### 2. Find Products by Type

```cypher
// Find all broadband products
MATCH (p:tmf620__ProductOffering)
WHERE p.tmf620__productOfferingType = 'broadband'
RETURN p.sch__name AS name,
       p.intent__downloadSpeed AS downloadSpeed,
       p.intent__uploadSpeed AS uploadSpeed,
       p.intent__priceAmount AS price
ORDER BY p.intent__downloadSpeed DESC
```

**Use Cases:**
- Product catalog filtering
- Type-specific product search
- AI intent analysis (e.g., "I want broadband")

---

### 3. Find Related Products for Bundle Recommendations

```cypher
// Given a product, find frequently bundled products
MATCH (product:Resource {sch__identifier: 'PROD-BB-500'})
MATCH (product)-[:intent__frequentlyBundledWith]->(bundledProduct:Resource)
RETURN product.sch__name AS baseProduct,
       bundledProduct.sch__name AS recommendation,
       bundledProduct.tmf620__productOfferingType AS type,
       bundledProduct.intent__priceAmount AS price
ORDER BY bundledProduct.intent__popularityScore DESC
```

**Use Cases:**
- Bundle recommendations
- Upsell/cross-sell suggestions
- AI-powered offer generation

---

### 4. Find Complementary Products (Cross-Sell)

```cypher
// Find products that complement each other by type
MATCH (bb:Resource {tmf620__productOfferingType: 'broadband'})
MATCH (bb)-[r:intent__complementsProduct]->(complement:Resource)
RETURN bb.sch__name AS product,
       complement.sch__name AS complement,
       complement.tmf620__productOfferingType AS complementType,
       r.intent__complementStrength AS strength,
       complement.intent__priceAmount AS price
ORDER BY r.intent__complementStrength DESC, complement.intent__popularityScore DESC
```

**Use Cases:**
- Cross-sell recommendations
- "Customers also bought..." suggestions
- Smart bundle creation

---

### 5. Find Upgrade Paths

```cypher
// Find upgrade options for a product
MATCH (current:Resource {sch__identifier: 'PROD-BB-500'})
MATCH (current)-[r:intent__upgradesTo]->(upgrade:Resource)
RETURN current.sch__name AS currentProduct,
       current.intent__priceAmount AS currentPrice,
       upgrade.sch__name AS upgradeProduct,
       upgrade.intent__priceAmount AS upgradePrice,
       r.intent__upgradePriceDifference AS additionalCost
```

**Use Cases:**
- Upsell recommendations
- Customer upgrade flows
- "Upgrade available" notifications

---

### 6. Filter by Customer Segment

```cypher
// Find premium products
MATCH (p:tmf620__ProductOffering)
WHERE p.intent__customerSegment = 'premium'
RETURN p.sch__name AS name,
       p.tmf620__productOfferingType AS type,
       p.intent__priceAmount AS price,
       p.intent__popularityScore AS popularity
ORDER BY p.intent__priceAmount DESC
```

**Use Cases:**
- Customer segment targeting
- Personalized product recommendations
- Premium vs. basic product filtering

---

### 7. AI Recommendation Query

```cypher
// Get top AI-recommended products
MATCH (p:Resource:sch__Product)
WHERE p.intent__aiRecommendationWeight >= 0.75
  AND p.tmf620__lifecycleStatus = 'Active'
RETURN p.sch__name AS product,
       p.tmf620__productOfferingType AS type,
       p.intent__aiRecommendationWeight AS aiWeight,
       p.intent__popularityScore AS popularity,
       p.intent__priceAmount AS price
ORDER BY p.intent__aiRecommendationWeight DESC,
         p.intent__popularityScore DESC
LIMIT 5
```

**Use Cases:**
- AI-powered product recommendations
- Claude intent analysis integration
- Personalized offer generation

---

### 8. Price Range Search

```cypher
// Find products within a price range
MATCH (p:tmf620__ProductOffering)
WHERE p.intent__priceAmount >= 20.00
  AND p.intent__priceAmount <= 50.00
  AND p.intent__priceCurrency = 'EUR'
RETURN p.sch__name AS name,
       p.tmf620__productOfferingType AS type,
       p.intent__priceAmount AS price,
       p.intent__customerSegment AS segment
ORDER BY p.intent__priceAmount ASC
```

**Use Cases:**
- Budget-based product search
- Price filtering in UI
- AI intent: "I can spend between €20 and €50"

---

### 9. Multi-Product Bundle Discovery

```cypher
// Find best product combinations (broadband + mobile)
MATCH (bb:Resource {tmf620__productOfferingType: 'broadband'})
MATCH (mob:Resource {tmf620__productOfferingType: 'mobile'})
WHERE (bb)-[:intent__complementsProduct]->(mob)
RETURN bb.sch__name AS broadband,
       bb.intent__priceAmount AS bbPrice,
       mob.sch__name AS mobile,
       mob.intent__priceAmount AS mobPrice,
       (bb.intent__priceAmount + mob.intent__priceAmount) AS totalPrice,
       (bb.intent__popularityScore + mob.intent__popularityScore) / 2 AS avgPopularity
ORDER BY avgPopularity DESC, totalPrice ASC
```

**Use Cases:**
- Automatic bundle creation
- Best value combination finder
- AI-driven offer optimization

---

### 10. Product Comparison Query

```cypher
// Compare products of the same type
MATCH (p:tmf620__ProductOffering)
WHERE p.tmf620__productOfferingType = 'mobile'
RETURN p.sch__name AS product,
       p.intent__dataCapacity AS data,
       p.intent__networkType AS network,
       p.intent__roaming AS roaming,
       p.intent__priceAmount AS price,
       p.intent__popularityScore AS popularity
ORDER BY p.intent__priceAmount ASC
```

**Use Cases:**
- Product comparison tables
- "Compare products" UI feature
- AI-driven product differentiation

---

## Knowledge Graph MCP Tool Integration

### Current MCP Tools (Legacy Model)

The Knowledge Graph MCP currently implements these tools:

1. `find_related_products` - Find products related to a given product
2. `search_product_catalog` - Search for products by criteria
3. `get_bundle_recommendations` - Get bundle recommendations

### Recommended Updates for RDF Support

#### Tool 1: `find_related_products` (UPDATE REQUIRED)

**Current Query (Legacy):**
```cypher
MATCH (p:Product {id: $productId})
MATCH (p)-[:COMPLEMENTS]->(related:Product)
RETURN related
```

**New Query (RDF):**
```cypher
MATCH (p:Resource {sch__identifier: $productId})
MATCH (p)-[:intent__complementsProduct|intent__frequentlyBundledWith]->(related:Resource)
RETURN related.uri AS uri,
       related.sch__name AS name,
       related.tmf620__productOfferingType AS type,
       related.intent__priceAmount AS price,
       related.intent__popularityScore AS popularity
ORDER BY related.intent__popularityScore DESC
```

#### Tool 2: `search_product_catalog` (UPDATE REQUIRED)

**Current Query (Legacy):**
```cypher
MATCH (p:Product)
WHERE p.type = $productType
  AND p.price <= $maxPrice
RETURN p
```

**New Query (RDF):**
```cypher
MATCH (p:tmf620__ProductOffering)
WHERE p.tmf620__productOfferingType = $productType
  AND p.intent__priceAmount <= $maxPrice
  AND p.tmf620__lifecycleStatus = 'Active'
RETURN p.uri AS uri,
       p.sch__name AS name,
       p.sch__description AS description,
       p.intent__priceAmount AS price,
       p.intent__priceCurrency AS currency,
       p.intent__customerSegment AS segment,
       p.intent__popularityScore AS popularity
ORDER BY p.intent__aiRecommendationWeight DESC
```

#### Tool 3: `get_bundle_recommendations` (UPDATE REQUIRED)

**Current Query (Legacy):**
```cypher
MATCH (b:Bundle)-[:INCLUDES]->(p:Product)
WHERE p.id = $productId
RETURN b, collect(p) as products
```

**New Query (RDF - Phase 3):**
```cypher
// Note: This will be fully implemented in Phase 3 when bundles are converted to RDF
MATCH (p:Resource {sch__identifier: $productId})
MATCH (p)-[:intent__frequentlyBundledWith]->(bundled:Resource)
RETURN p.sch__name AS baseProduct,
       collect({
         name: bundled.sch__name,
         type: bundled.tmf620__productOfferingType,
         price: bundled.intent__priceAmount
       }) AS bundleProducts
```

---

## Migration Path for MCP Service

### Phase 2 (Current) - Product RDF Support

✅ **Status:** Complete

**Changes Required:**
1. Update Neo4j driver queries to use RDF property names
2. Add support for `:Resource` and `:tmf620__ProductOffering` labels
3. Update response DTOs to include URIs
4. Add TMF620 compliance fields

### Phase 3 (Next) - Bundle RDF Support

🔄 **Status:** Planned

**Changes Required:**
1. Convert 4 legacy bundles to RDF
2. Update bundle-related queries
3. Implement `tmf620:BundledProductOffering` types
4. Add SHACL validation

### Phase 4 - Full RDF Migration

🔮 **Status:** Future

**Changes Required:**
1. Deprecate legacy `:Product` queries
2. Full migration to RDF-only data model
3. SPARQL endpoint (optional)
4. External TM Forum ontology integration

---

## Testing Queries

### Test 1: Verify RDF Data Exists

```cypher
MATCH (p:Resource:sch__Product)
RETURN count(p) AS rdfProductCount
// Expected: 6
```

### Test 2: Verify Legacy Data Still Works

```cypher
MATCH (p:Product) WHERE NOT p:Resource
RETURN count(p) AS legacyProductCount
// Expected: 6
```

### Test 3: Verify Relationships

```cypher
MATCH ()-[r:intent__upgradesTo|intent__complementsProduct|intent__frequentlyBundledWith]->()
RETURN type(r) AS relationshipType, count(r) AS count
```

Expected:
| Relationship Type | Count |
|-------------------|-------|
| intent__upgradesTo | 3 |
| intent__complementsProduct | 8+ |
| intent__frequentlyBundledWith | 4 |

---

## Performance Considerations

### Indexes Required

Create these indexes for optimal RDF query performance:

```cypher
// URI index (primary key)
CREATE INDEX rdf_resource_uri IF NOT EXISTS
FOR (r:Resource) ON (r.uri);

// Product identifier index
CREATE INDEX rdf_product_identifier IF NOT EXISTS
FOR (p:sch__Product) ON (p.sch__identifier);

// Product type index
CREATE INDEX tmf620_offering_type IF NOT EXISTS
FOR (p:tmf620__ProductOffering) ON (p.tmf620__productOfferingType);

// Customer segment index
CREATE INDEX intent_customer_segment IF NOT EXISTS
FOR (r:Resource) ON (r.intent__customerSegment);

// AI recommendation weight index
CREATE INDEX intent_ai_weight IF NOT EXISTS
FOR (r:Resource) ON (r.intent__aiRecommendationWeight);

// Lifecycle status index
CREATE INDEX tmf620_lifecycle_status IF NOT EXISTS
FOR (p:tmf620__ProductOffering) ON (p.tmf620__lifecycleStatus);
```

### Query Optimization Tips

1. **Always filter by labels:** Use `:Resource:sch__Product` or `:tmf620__ProductOffering`
2. **Use indexed properties:** Filter by `sch__identifier`, `tmf620__productOfferingType`, `intent__customerSegment`
3. **Limit results:** Add `LIMIT` clauses for large result sets
4. **Order efficiently:** Order by indexed properties when possible

---

## API Response Format (Recommended)

### RDF-Compliant Product Response

```json
{
  "uri": "https://intent-platform.example.com/product/PROD-BB-500",
  "id": "PROD-BB-500",
  "name": "Broadband 500Mbps",
  "description": "High-speed broadband with 500Mbps download and 50Mbps upload",
  "type": "broadband",
  "price": {
    "amount": 39.99,
    "currency": "EUR"
  },
  "tmf620": {
    "productOfferingId": "PROD-BB-500",
    "productOfferingType": "broadband",
    "lifecycleStatus": "Active",
    "version": "1.0"
  },
  "ai": {
    "popularityScore": 85,
    "recommendationWeight": 0.8
  },
  "segment": "residential",
  "created": "2025-01-01T00:00:00Z",
  "modified": "2026-01-10T00:00:00Z",
  "_links": {
    "self": {
      "href": "/api/products/PROD-BB-500"
    },
    "upgrades": {
      "href": "/api/products/PROD-BB-500/upgrades"
    },
    "complements": {
      "href": "/api/products/PROD-BB-500/complements"
    }
  }
}
```

---

## Next Steps

1. **Update Knowledge Graph MCP Service:**
   - Modify Neo4j queries to use RDF properties
   - Update response DTOs
   - Deploy new version to Kubernetes

2. **Test Integration:**
   - Run integration tests with Business Intent Agent
   - Verify Claude AI receives RDF-compliant data
   - Test bundle recommendations

3. **Phase 3 Planning:**
   - Convert bundles to RDF
   - Implement SHACL validation
   - Full TMF620 compliance

---

**Document Owner:** Business Intent Agent Team
**Last Updated:** January 10, 2026 (Phase 2 Complete)
**Next Review:** Phase 3 Bundle Migration
