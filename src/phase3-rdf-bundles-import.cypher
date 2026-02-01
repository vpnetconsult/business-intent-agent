// Phase 3: Import 4 bundles as RDF-structured data
// Bundles: WFH Premium, Family Connect, Gaming, Streaming

// ==========================================
// BUNDLE 1: Work-from-Home Premium Bundle
// ==========================================

CREATE (wfh:Resource:sch__Offer:tmf620__BundledProductOffering {
  uri: 'https://intent-platform.example.com/bundle/BUNDLE-WFH-PREMIUM',
  sch__name: 'Work-from-Home Premium Bundle',
  sch__description: 'Perfect for professionals working from home with high-speed broadband and reliable mobile',
  sch__identifier: 'BUNDLE-WFH-PREMIUM',
  sch__sku: 'BUNDLE-WFH-PREMIUM',
  tmf620__bundleId: 'BUNDLE-WFH-PREMIUM',
  tmf620__lifecycleStatus: 'Active',
  tmf620__version: '1.0',
  dc__created: datetime('2025-01-01T00:00:00Z'),
  dc__modified: datetime('2026-01-10T00:00:00Z'),
  dc__creator: 'Intent Platform Team',
  intent__popularityScore: 92,
  intent__discountPercentage: 15,
  intent__customerSegment: 'premium',
  intent__targetIntent: 'work_from_home',
  intent__aiRecommendationWeight: 0.92,
  intent__bundlePrice: 55.49,
  intent__originalPrice: 65.28,
  intent__savings: 9.79,
  intent__priceCurrency: 'EUR'
});

// ==========================================
// BUNDLE 2: Family Connect Bundle
// ==========================================

CREATE (family:Resource:sch__Offer:tmf620__BundledProductOffering {
  uri: 'https://intent-platform.example.com/bundle/BUNDLE-FAMILY',
  sch__name: 'Family Connect Bundle',
  sch__description: 'Complete connectivity for the whole family with ultra-fast broadband, mobile data, and TV entertainment',
  sch__identifier: 'BUNDLE-FAMILY',
  sch__sku: 'BUNDLE-FAMILY',
  tmf620__bundleId: 'BUNDLE-FAMILY',
  tmf620__lifecycleStatus: 'Active',
  tmf620__version: '2.0',
  dc__created: datetime('2025-01-01T00:00:00Z'),
  dc__modified: datetime('2026-01-10T00:00:00Z'),
  dc__creator: 'Intent Platform Team',
  intent__popularityScore: 88,
  intent__discountPercentage: 20,
  intent__customerSegment: 'standard',
  intent__targetIntent: 'family',
  intent__aiRecommendationWeight: 0.88,
  intent__bundlePrice: 79.99,
  intent__originalPrice: 99.99,
  intent__savings: 20.00,
  intent__priceCurrency: 'EUR'
});

// ==========================================
// BUNDLE 3: Ultimate Gaming Bundle
// ==========================================

CREATE (gaming:Resource:sch__Offer:tmf620__BundledProductOffering {
  uri: 'https://intent-platform.example.com/bundle/BUNDLE-GAMING',
  sch__name: 'Ultimate Gaming Bundle',
  sch__description: 'High-speed internet and mobile for gamers with ultra-low latency and priority support',
  sch__identifier: 'BUNDLE-GAMING',
  sch__sku: 'BUNDLE-GAMING',
  tmf620__bundleId: 'BUNDLE-GAMING',
  tmf620__lifecycleStatus: 'Active',
  tmf620__version: '1.5',
  dc__created: datetime('2025-02-01T00:00:00Z'),
  dc__modified: datetime('2026-01-10T00:00:00Z'),
  dc__creator: 'Intent Platform Team',
  intent__popularityScore: 85,
  intent__discountPercentage: 18,
  intent__customerSegment: 'premium',
  intent__targetIntent: 'gaming',
  intent__aiRecommendationWeight: 0.85,
  intent__bundlePrice: 73.79,
  intent__originalPrice: 89.98,
  intent__savings: 16.19,
  intent__priceCurrency: 'EUR'
});

// ==========================================
// BUNDLE 4: Entertainment Streaming Bundle
// ==========================================

CREATE (streaming:Resource:sch__Offer:tmf620__BundledProductOffering {
  uri: 'https://intent-platform.example.com/bundle/BUNDLE-STREAMING',
  sch__name: 'Entertainment Streaming Bundle',
  sch__description: 'Perfect for streaming enthusiasts with ultra-fast broadband, premium TV channels, and mobile data',
  sch__identifier: 'BUNDLE-STREAMING',
  sch__sku: 'BUNDLE-STREAMING',
  tmf620__bundleId: 'BUNDLE-STREAMING',
  tmf620__lifecycleStatus: 'Active',
  tmf620__version: '2.0',
  dc__created: datetime('2025-03-01T00:00:00Z'),
  dc__modified: datetime('2026-01-10T00:00:00Z'),
  dc__creator: 'Intent Platform Team',
  intent__popularityScore: 90,
  intent__discountPercentage: 22,
  intent__customerSegment: 'premium',
  intent__targetIntent: 'streaming',
  intent__aiRecommendationWeight: 0.90,
  intent__bundlePrice: 85.59,
  intent__originalPrice: 109.99,
  intent__savings: 24.40,
  intent__priceCurrency: 'EUR'
});

// ==========================================
// BUNDLE-PRODUCT RELATIONSHIPS
// ==========================================

// WFH Bundle includes: BB-500 (pos 1), MOB-50GB (pos 2)
MATCH (bundle:tmf620__BundledProductOffering {uri: 'https://intent-platform.example.com/bundle/BUNDLE-WFH-PREMIUM'})
MATCH (bb500:sch__Product {sch__identifier: 'PROD-BB-500'})
MATCH (mob50:sch__Product {sch__identifier: 'PROD-MOB-50GB'})
CREATE (bundle)-[:tmf620__includes {intent__position: 1, intent__recommended: true}]->(bb500)
CREATE (bundle)-[:tmf620__includes {intent__position: 2, intent__recommended: true}]->(mob50);

// Family Bundle includes: BB-1GB (pos 1), MOB-50GB (pos 2), TV-BASIC (pos 3)
MATCH (bundle:tmf620__BundledProductOffering {uri: 'https://intent-platform.example.com/bundle/BUNDLE-FAMILY'})
MATCH (bb1gb:sch__Product {sch__identifier: 'PROD-BB-1GB'})
MATCH (mob50:sch__Product {sch__identifier: 'PROD-MOB-50GB'})
MATCH (tvbasic:sch__Product {sch__identifier: 'PROD-TV-BASIC'})
CREATE (bundle)-[:tmf620__includes {intent__position: 1, intent__recommended: true}]->(bb1gb)
CREATE (bundle)-[:tmf620__includes {intent__position: 2, intent__recommended: true}]->(mob50)
CREATE (bundle)-[:tmf620__includes {intent__position: 3, intent__recommended: false}]->(tvbasic);

// Gaming Bundle includes: BB-1GB (pos 1), MOB-UNLIM (pos 2)
MATCH (bundle:tmf620__BundledProductOffering {uri: 'https://intent-platform.example.com/bundle/BUNDLE-GAMING'})
MATCH (bb1gb:sch__Product {sch__identifier: 'PROD-BB-1GB'})
MATCH (mobunl:sch__Product {sch__identifier: 'PROD-MOB-UNL'})
CREATE (bundle)-[:tmf620__includes {intent__position: 1, intent__recommended: true}]->(bb1gb)
CREATE (bundle)-[:tmf620__includes {intent__position: 2, intent__recommended: true}]->(mobunl);

// Streaming Bundle includes: BB-1GB (pos 1), TV-PREMIUM (pos 2), MOB-50GB (pos 3)
MATCH (bundle:tmf620__BundledProductOffering {uri: 'https://intent-platform.example.com/bundle/BUNDLE-STREAMING'})
MATCH (bb1gb:sch__Product {sch__identifier: 'PROD-BB-1GB'})
MATCH (tvprem:sch__Product {sch__identifier: 'PROD-TV-PREMIUM'})
MATCH (mob50:sch__Product {sch__identifier: 'PROD-MOB-50GB'})
CREATE (bundle)-[:tmf620__includes {intent__position: 1, intent__recommended: true}]->(bb1gb)
CREATE (bundle)-[:tmf620__includes {intent__position: 2, intent__recommended: true}]->(tvprem)
CREATE (bundle)-[:tmf620__includes {intent__position: 3, intent__recommended: false}]->(mob50);

// ==========================================
// REVERSE RELATIONSHIPS: Products to Bundles
// ==========================================

// BB-500 is in WFH bundle
MATCH (product:sch__Product {sch__identifier: 'PROD-BB-500'})
MATCH (bundle:tmf620__BundledProductOffering {tmf620__bundleId: 'BUNDLE-WFH-PREMIUM'})
CREATE (product)-[:intent__includedinBundle]->(bundle);

// BB-1GB is in Family, Gaming, Streaming bundles
MATCH (product:sch__Product {sch__identifier: 'PROD-BB-1GB'})
MATCH (family:tmf620__BundledProductOffering {tmf620__bundleId: 'BUNDLE-FAMILY'})
MATCH (gaming:tmf620__BundledProductOffering {tmf620__bundleId: 'BUNDLE-GAMING'})
MATCH (streaming:tmf620__BundledProductOffering {tmf620__bundleId: 'BUNDLE-STREAMING'})
CREATE (product)-[:intent__includedinBundle]->(family)
CREATE (product)-[:intent__includedinBundle]->(gaming)
CREATE (product)-[:intent__includedinBundle]->(streaming);

// MOB-50GB is in WFH, Family, Streaming bundles
MATCH (product:sch__Product {sch__identifier: 'PROD-MOB-50GB'})
MATCH (wfh:tmf620__BundledProductOffering {tmf620__bundleId: 'BUNDLE-WFH-PREMIUM'})
MATCH (family:tmf620__BundledProductOffering {tmf620__bundleId: 'BUNDLE-FAMILY'})
MATCH (streaming:tmf620__BundledProductOffering {tmf620__bundleId: 'BUNDLE-STREAMING'})
CREATE (product)-[:intent__includedinBundle]->(wfh)
CREATE (product)-[:intent__includedinBundle]->(family)
CREATE (product)-[:intent__includedinBundle]->(streaming);

// MOB-UNL is in Gaming bundle
MATCH (product:sch__Product {sch__identifier: 'PROD-MOB-UNL'})
MATCH (bundle:tmf620__BundledProductOffering {tmf620__bundleId: 'BUNDLE-GAMING'})
CREATE (product)-[:intent__includedinBundle]->(bundle);

// TV-BASIC is in Family bundle
MATCH (product:sch__Product {sch__identifier: 'PROD-TV-BASIC'})
MATCH (bundle:tmf620__BundledProductOffering {tmf620__bundleId: 'BUNDLE-FAMILY'})
CREATE (product)-[:intent__includedinBundle]->(bundle);

// TV-PREMIUM is in Streaming bundle
MATCH (product:sch__Product {sch__identifier: 'PROD-TV-PREMIUM'})
MATCH (bundle:tmf620__BundledProductOffering {tmf620__bundleId: 'BUNDLE-STREAMING'})
CREATE (product)-[:intent__includedinBundle]->(bundle);

// ==========================================
// VERIFY IMPORT
// ==========================================

// Show all RDF bundles with their products
MATCH (b:Resource:tmf620__BundledProductOffering)
OPTIONAL MATCH (b)-[r:tmf620__includes]->(p:Resource)
RETURN b.uri AS bundle,
       b.sch__name AS bundleName,
       b.intent__bundlePrice AS price,
       b.intent__discountPercentage AS discount,
       b.intent__popularityScore AS popularity,
       count(p) AS productCount
ORDER BY popularity DESC;
