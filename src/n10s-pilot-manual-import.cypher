// Manual import of pilot RDF data using Cypher
// This demonstrates the RDF structure while working around n10s import issues

// Create Product 1: Broadband 500Mbps with RDF properties
CREATE (bb:Resource:sch__Product:tmf620__ProductOffering {
  uri: 'https://intent-platform.example.com/product/PROD-BB-500',
  sch__name: 'Broadband 500Mbps',
  sch__description: 'High-speed broadband with 500Mbps download and 50Mbps upload',
  sch__identifier: 'PROD-BB-500',
  sch__sku: 'PROD-BB-500',
  tmf620__productOfferingId: 'PROD-BB-500',
  tmf620__productOfferingType: 'broadband',
  tmf620__lifecycleStatus: 'Active',
  tmf620__version: '1.0',
  dc__created: datetime('2025-01-01T00:00:00Z'),
  dc__modified: datetime('2026-01-10T00:00:00Z'),
  dc__creator: 'Intent Platform Team',
  intent__popularityScore: 85,
  intent__customerSegment: 'residential',
  intent__aiRecommendationWeight: 0.8
});

// Create Product 2: Mobile Unlimited with RDF properties
CREATE (mob:Resource:sch__Product:tmf620__ProductOffering {
  uri: 'https://intent-platform.example.com/product/PROD-MOB-UNL',
  sch__name: 'Mobile Unlimited',
  sch__description: 'Unlimited calls, texts, and 5G data with EU roaming',
  sch__identifier: 'PROD-MOB-UNL',
  sch__sku: 'PROD-MOB-UNL',
  tmf620__productOfferingId: 'PROD-MOB-UNL',
  tmf620__productOfferingType: 'mobile',
  tmf620__lifecycleStatus: 'Active',
  tmf620__version: '2.1',
  dc__created: datetime('2025-02-15T00:00:00Z'),
  dc__modified: datetime('2026-01-10T00:00:00Z'),
  dc__creator: 'Intent Platform Team',
  intent__popularityScore: 92,
  intent__customerSegment: 'residential',
  intent__aiRecommendationWeight: 0.9
});

// Create relationships between products (RDF-style)
MATCH (bb:Resource {uri: 'https://intent-platform.example.com/product/PROD-BB-500'})
MATCH (mob:Resource {uri: 'https://intent-platform.example.com/product/PROD-MOB-UNL'})
CREATE (bb)-[:sch__isRelatedTo]->(mob)
CREATE (bb)-[:intent__frequentlyBundledWith]->(mob)
CREATE (mob)-[:sch__isRelatedTo]->(bb)
CREATE (mob)-[:intent__frequentlyBundledWith]->(bb);

// Verify the import
MATCH (p:Resource)
WHERE p.uri STARTS WITH 'https://intent-platform.example.com/product/'
RETURN p.uri, p.sch__name, p.tmf620__productOfferingType, labels(p) as types;
