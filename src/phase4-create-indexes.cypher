// Phase 4: Create Neo4j Indexes for RDF Query Performance
// These indexes optimize common query patterns for the Knowledge Graph MCP

// ==========================================
// PRIMARY INDEXES - URI and Identifier
// ==========================================

// Index on Resource URI (primary key for all RDF entities)
CREATE INDEX rdf_resource_uri IF NOT EXISTS
FOR (r:Resource) ON (r.uri);

// Index on Schema.org Product identifier
CREATE INDEX rdf_product_identifier IF NOT EXISTS
FOR (p:sch__Product) ON (p.sch__identifier);

// Index on Bundle identifier
CREATE INDEX rdf_bundle_identifier IF NOT EXISTS
FOR (b:tmf620__BundledProductOffering) ON (b.tmf620__bundleId);

// ==========================================
// TYPE AND CLASSIFICATION INDEXES
// ==========================================

// Index on TMF620 product offering type (broadband, mobile, tv)
CREATE INDEX tmf620_offering_type IF NOT EXISTS
FOR (p:tmf620__ProductOffering) ON (p.tmf620__productOfferingType);

// Index on lifecycle status (Active, Deprecated, etc.)
CREATE INDEX tmf620_lifecycle_status IF NOT EXISTS
FOR (p:tmf620__ProductOffering) ON (p.tmf620__lifecycleStatus);

// Index on bundle lifecycle status
CREATE INDEX tmf620_bundle_lifecycle_status IF NOT EXISTS
FOR (b:tmf620__BundledProductOffering) ON (b.tmf620__lifecycleStatus);

// ==========================================
// CUSTOMER SEGMENTATION INDEXES
// ==========================================

// Index on customer segment (premium, standard, basic, residential)
CREATE INDEX intent_customer_segment IF NOT EXISTS
FOR (r:Resource) ON (r.intent__customerSegment);

// Index on target intent for bundles (work_from_home, gaming, etc.)
CREATE INDEX intent_target_intent IF NOT EXISTS
FOR (b:tmf620__BundledProductOffering) ON (b.intent__targetIntent);

// ==========================================
// AI/RECOMMENDATION INDEXES
// ==========================================

// Index on AI recommendation weight (for sorting top recommendations)
CREATE INDEX intent_ai_weight IF NOT EXISTS
FOR (r:Resource) ON (r.intent__aiRecommendationWeight);

// Index on popularity score (for sorting popular products)
CREATE INDEX intent_popularity_score IF NOT EXISTS
FOR (r:Resource) ON (r.intent__popularityScore);

// ==========================================
// PRICING INDEXES
// ==========================================

// Index on product price amount (for price range queries)
CREATE INDEX intent_price_amount IF NOT EXISTS
FOR (p:tmf620__ProductOffering) ON (p.intent__priceAmount);

// Index on bundle price amount
CREATE INDEX intent_bundle_price_amount IF NOT EXISTS
FOR (b:tmf620__BundledProductOffering) ON (b.intent__bundlePrice);

// Index on price currency
CREATE INDEX intent_price_currency IF NOT EXISTS
FOR (r:Resource) ON (r.intent__priceCurrency);

// ==========================================
// NAME SEARCH INDEXES (Full-Text)
// ==========================================

// Full-text index on product names for search
CREATE FULLTEXT INDEX product_name_fulltext IF NOT EXISTS
FOR (p:sch__Product) ON EACH [p.sch__name, p.sch__description];

// Full-text index on bundle names for search
CREATE FULLTEXT INDEX bundle_name_fulltext IF NOT EXISTS
FOR (b:sch__Offer) ON EACH [b.sch__name, b.sch__description];

// ==========================================
// TEMPORAL INDEXES
// ==========================================

// Index on creation date (for "recently added" queries)
CREATE INDEX dc_created IF NOT EXISTS
FOR (r:Resource) ON (r.dc__created);

// Index on modification date (for "recently updated" queries)
CREATE INDEX dc_modified IF NOT EXISTS
FOR (r:Resource) ON (r.dc__modified);

// ==========================================
// VERIFY INDEXES
// ==========================================

SHOW INDEXES
YIELD name, type, entityType, labelsOrTypes, properties, state
WHERE name STARTS WITH 'rdf_' OR name STARTS WITH 'tmf620_' OR name STARTS WITH 'intent_' OR name STARTS WITH 'dc_' OR name CONTAINS 'fulltext'
RETURN name, type, entityType, labelsOrTypes, properties, state
ORDER BY name;
