// Phase 2: Import remaining 4 products as RDF-structured data
// Products: Broadband 1Gbps, Mobile 50GB, TV Basic, TV Premium

// ==========================================
// PRODUCT 1: Broadband 1Gbps
// ==========================================

CREATE (bb1gb:Resource:sch__Product:tmf620__ProductOffering {
  uri: 'https://intent-platform.example.com/product/PROD-BB-1GB',
  sch__name: 'Broadband 1Gbps',
  sch__description: 'Ultra-fast fiber broadband with 1Gbps download, mesh WiFi, and priority support',
  sch__identifier: 'PROD-BB-1GB',
  sch__sku: 'PROD-BB-1GB',
  tmf620__productOfferingId: 'PROD-BB-1GB',
  tmf620__productOfferingType: 'broadband',
  tmf620__lifecycleStatus: 'Active',
  tmf620__version: '2.0',
  dc__created: datetime('2025-01-01T00:00:00Z'),
  dc__modified: datetime('2026-01-10T00:00:00Z'),
  dc__creator: 'Intent Platform Team',
  intent__popularityScore: 88,
  intent__customerSegment: 'premium',
  intent__aiRecommendationWeight: 0.85,
  intent__downloadSpeed: 1000,
  intent__uploadSpeed: 100,
  intent__speedUnit: 'Mbps',
  intent__dataCapacity: 'Unlimited',
  intent__features: ['unlimited_data', 'fiber', 'mesh_wifi', 'priority_support'],
  intent__priceAmount: 59.99,
  intent__priceCurrency: 'EUR'
});

// ==========================================
// PRODUCT 2: Mobile 50GB
// ==========================================

CREATE (mob50gb:Resource:sch__Product:tmf620__ProductOffering {
  uri: 'https://intent-platform.example.com/product/PROD-MOB-50GB',
  sch__name: 'Mobile 50GB',
  sch__description: '5G mobile plan with 50GB data, unlimited calls, and EU roaming',
  sch__identifier: 'PROD-MOB-50GB',
  sch__sku: 'PROD-MOB-50GB',
  tmf620__productOfferingId: 'PROD-MOB-50GB',
  tmf620__productOfferingType: 'mobile',
  tmf620__lifecycleStatus: 'Active',
  tmf620__version: '1.5',
  dc__created: datetime('2025-02-01T00:00:00Z'),
  dc__modified: datetime('2026-01-10T00:00:00Z'),
  dc__creator: 'Intent Platform Team',
  intent__popularityScore: 78,
  intent__customerSegment: 'standard',
  intent__aiRecommendationWeight: 0.75,
  intent__dataCapacity: '50GB',
  intent__networkType: '5G',
  intent__callsIncluded: 'Unlimited',
  intent__smsIncluded: 'Unlimited',
  intent__roaming: 'EU',
  intent__features: ['5g', 'unlimited_calls', 'eu_roaming'],
  intent__priceAmount: 25.00,
  intent__priceCurrency: 'EUR'
});

// ==========================================
// PRODUCT 3: TV Basic
// ==========================================

CREATE (tvbasic:Resource:sch__Product:tmf620__ProductOffering {
  uri: 'https://intent-platform.example.com/product/PROD-TV-BASIC',
  sch__name: 'TV Basic',
  sch__description: 'Basic TV package with 100 HD channels, recording, and 2 simultaneous streams',
  sch__identifier: 'PROD-TV-BASIC',
  sch__sku: 'PROD-TV-BASIC',
  tmf620__productOfferingId: 'PROD-TV-BASIC',
  tmf620__productOfferingType: 'tv',
  tmf620__lifecycleStatus: 'Active',
  tmf620__version: '1.0',
  dc__created: datetime('2025-03-01T00:00:00Z'),
  dc__modified: datetime('2026-01-10T00:00:00Z'),
  dc__creator: 'Intent Platform Team',
  intent__popularityScore: 65,
  intent__customerSegment: 'basic',
  intent__aiRecommendationWeight: 0.65,
  intent__channelCount: 100,
  intent__videoQuality: 'HD',
  intent__simultaneousStreams: 2,
  intent__recordingEnabled: true,
  intent__features: ['hd', 'recording', '2_screens'],
  intent__priceAmount: 15.00,
  intent__priceCurrency: 'EUR'
});

// ==========================================
// PRODUCT 4: TV Premium
// ==========================================

CREATE (tvpremium:Resource:sch__Product:tmf620__ProductOffering {
  uri: 'https://intent-platform.example.com/product/PROD-TV-PREMIUM',
  sch__name: 'TV Premium',
  sch__description: 'Premium TV package with 200 4K channels, sports, movies, and 5 simultaneous streams',
  sch__identifier: 'PROD-TV-PREMIUM',
  sch__sku: 'PROD-TV-PREMIUM',
  tmf620__productOfferingId: 'PROD-TV-PREMIUM',
  tmf620__productOfferingType: 'tv',
  tmf620__lifecycleStatus: 'Active',
  tmf620__version: '2.5',
  dc__created: datetime('2025-03-01T00:00:00Z'),
  dc__modified: datetime('2026-01-10T00:00:00Z'),
  dc__creator: 'Intent Platform Team',
  intent__popularityScore: 82,
  intent__customerSegment: 'premium',
  intent__aiRecommendationWeight: 0.80,
  intent__channelCount: 200,
  intent__videoQuality: '4K',
  intent__simultaneousStreams: 5,
  intent__recordingEnabled: true,
  intent__sportsContent: true,
  intent__moviesContent: true,
  intent__features: ['4k', 'recording', '5_screens', 'sports', 'movies'],
  intent__priceAmount: 25.00,
  intent__priceCurrency: 'EUR'
});

// ==========================================
// UPGRADE RELATIONSHIPS
// ==========================================

// Broadband upgrade path: 500Mbps -> 1Gbps
MATCH (bb500:Resource {uri: 'https://intent-platform.example.com/product/PROD-BB-500'})
MATCH (bb1gb:Resource {uri: 'https://intent-platform.example.com/product/PROD-BB-1GB'})
CREATE (bb500)-[:intent__upgradesTo {intent__upgradePriceDifference: 20.00}]->(bb1gb);

// Mobile upgrade path: 50GB -> Unlimited
MATCH (mob50gb:Resource {uri: 'https://intent-platform.example.com/product/PROD-MOB-50GB'})
MATCH (mobunl:Resource {uri: 'https://intent-platform.example.com/product/PROD-MOB-UNL'})
CREATE (mob50gb)-[:intent__upgradesTo {intent__upgradePriceDifference: 10.00}]->(mobunl);

// TV upgrade path: Basic -> Premium
MATCH (tvbasic:Resource {uri: 'https://intent-platform.example.com/product/PROD-TV-BASIC'})
MATCH (tvprem:Resource {uri: 'https://intent-platform.example.com/product/PROD-TV-PREMIUM'})
CREATE (tvbasic)-[:intent__upgradesTo {intent__upgradePriceDifference: 10.00}]->(tvprem);

// ==========================================
// COMPLEMENTARITY RELATIONSHIPS
// ==========================================

// Broadband 1Gbps complements mobile products
MATCH (bb1gb:Resource {uri: 'https://intent-platform.example.com/product/PROD-BB-1GB'})
MATCH (mob50gb:Resource {uri: 'https://intent-platform.example.com/product/PROD-MOB-50GB'})
MATCH (mobunl:Resource {uri: 'https://intent-platform.example.com/product/PROD-MOB-UNL'})
CREATE (bb1gb)-[:sch__isRelatedTo]->(mob50gb)
CREATE (bb1gb)-[:sch__isRelatedTo]->(mobunl)
CREATE (bb1gb)-[:intent__complementsProduct {intent__complementStrength: 0.90}]->(mob50gb)
CREATE (bb1gb)-[:intent__complementsProduct {intent__complementStrength: 0.90}]->(mobunl);

// Broadband 1Gbps complements TV products
MATCH (bb1gb:Resource {uri: 'https://intent-platform.example.com/product/PROD-BB-1GB'})
MATCH (tvbasic:Resource {uri: 'https://intent-platform.example.com/product/PROD-TV-BASIC'})
MATCH (tvprem:Resource {uri: 'https://intent-platform.example.com/product/PROD-TV-PREMIUM'})
CREATE (bb1gb)-[:sch__isRelatedTo]->(tvbasic)
CREATE (bb1gb)-[:sch__isRelatedTo]->(tvprem)
CREATE (bb1gb)-[:intent__complementsProduct {intent__complementStrength: 0.75}]->(tvbasic)
CREATE (bb1gb)-[:intent__complementsProduct {intent__complementStrength: 0.75}]->(tvprem);

// Mobile 50GB complements TV products
MATCH (mob50gb:Resource {uri: 'https://intent-platform.example.com/product/PROD-MOB-50GB'})
MATCH (tvbasic:Resource {uri: 'https://intent-platform.example.com/product/PROD-TV-BASIC'})
MATCH (tvprem:Resource {uri: 'https://intent-platform.example.com/product/PROD-TV-PREMIUM'})
CREATE (mob50gb)-[:sch__isRelatedTo]->(tvbasic)
CREATE (mob50gb)-[:sch__isRelatedTo]->(tvprem)
CREATE (mob50gb)-[:intent__complementsProduct {intent__complementStrength: 0.60}]->(tvbasic)
CREATE (mob50gb)-[:intent__complementsProduct {intent__complementStrength: 0.60}]->(tvprem);

// ==========================================
// VERIFY IMPORT
// ==========================================

// Show all RDF products
MATCH (p:Resource:sch__Product)
RETURN p.uri, p.sch__name, p.tmf620__productOfferingType, p.intent__popularityScore
ORDER BY p.intent__popularityScore DESC;
