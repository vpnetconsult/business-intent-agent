// Clear existing data
MATCH (n) DETACH DELETE n;

// Create Product nodes
CREATE (bb500:Product {
  id: 'PROD-BB-500',
  name: 'Broadband 500Mbps',
  type: 'broadband',
  speed: '500Mbps',
  price: 39.99,
  currency: 'EUR',
  features: ['unlimited_data', 'fiber', 'wifi_router']
});

CREATE (bb1gb:Product {
  id: 'PROD-BB-1GB',
  name: 'Broadband 1Gbps',
  type: 'broadband',
  speed: '1Gbps',
  price: 59.99,
  currency: 'EUR',
  features: ['unlimited_data', 'fiber', 'mesh_wifi', 'priority_support']
});

CREATE (mob50gb:Product {
  id: 'PROD-MOB-50GB',
  name: 'Mobile 50GB',
  type: 'mobile',
  data: '50GB',
  price: 25.00,
  currency: 'EUR',
  features: ['5g', 'unlimited_calls', 'eu_roaming']
});

CREATE (mobUnlim:Product {
  id: 'PROD-MOB-UNLIM',
  name: 'Mobile Unlimited',
  type: 'mobile',
  data: 'Unlimited',
  price: 35.00,
  currency: 'EUR',
  features: ['5g', 'unlimited_calls', 'unlimited_data', 'global_roaming']
});

CREATE (tvBasic:Product {
  id: 'PROD-TV-BASIC',
  name: 'TV Basic',
  type: 'tv',
  channels: 100,
  price: 15.00,
  currency: 'EUR',
  features: ['hd', 'recording', '2_screens']
});

CREATE (tvPremium:Product {
  id: 'PROD-TV-PREMIUM',
  name: 'TV Premium',
  type: 'tv',
  channels: 200,
  price: 25.00,
  currency: 'EUR',
  features: ['4k', 'recording', '5_screens', 'sports', 'movies']
});

// Create Bundle nodes
CREATE (wfhBundle:Bundle {
  id: 'BUNDLE-WFH-PREMIUM',
  name: 'Work-from-Home Premium Bundle',
  description: 'Perfect for professionals working from home',
  discount: 15,
  popularity_score: 0.92
});

CREATE (familyBundle:Bundle {
  id: 'BUNDLE-FAMILY',
  name: 'Family Connect Bundle',
  description: 'Complete connectivity for the whole family',
  discount: 20,
  popularity_score: 0.88
});

CREATE (gamingBundle:Bundle {
  id: 'BUNDLE-GAMING',
  name: 'Ultimate Gaming Bundle',
  description: 'High-speed internet and mobile for gamers',
  discount: 18,
  popularity_score: 0.85
});

CREATE (streamingBundle:Bundle {
  id: 'BUNDLE-STREAMING',
  name: 'Entertainment Streaming Bundle',
  description: 'Perfect for streaming enthusiasts',
  discount: 22,
  popularity_score: 0.90
});

// Create Intent nodes
CREATE (wfhIntent:Intent {name: 'work_from_home', priority: 'high'});
CREATE (gamingIntent:Intent {name: 'gaming', priority: 'high'});
CREATE (streamingIntent:Intent {name: 'streaming', priority: 'high'});
CREATE (familyIntent:Intent {name: 'family', priority: 'medium'});
CREATE (reliabilityIntent:Intent {name: 'reliability', priority: 'high'});
CREATE (speedIntent:Intent {name: 'speed', priority: 'high'});

// Create Customer Segment nodes
CREATE (premiumSeg:Segment {name: 'premium', value: 'high'});
CREATE (standardSeg:Segment {name: 'standard', value: 'medium'});
CREATE (basicSeg:Segment {name: 'basic', value: 'low'});

// Create relationships: Bundle -> Product
MATCH (b:Bundle {id: 'BUNDLE-WFH-PREMIUM'}), (p:Product {id: 'PROD-BB-500'})
CREATE (b)-[:INCLUDES {position: 1, recommended: true}]->(p);

MATCH (b:Bundle {id: 'BUNDLE-WFH-PREMIUM'}), (p:Product {id: 'PROD-MOB-50GB'})
CREATE (b)-[:INCLUDES {position: 2, recommended: true}]->(p);

MATCH (b:Bundle {id: 'BUNDLE-FAMILY'}), (p:Product {id: 'PROD-BB-1GB'})
CREATE (b)-[:INCLUDES {position: 1, recommended: true}]->(p);

MATCH (b:Bundle {id: 'BUNDLE-FAMILY'}), (p:Product {id: 'PROD-MOB-50GB'})
CREATE (b)-[:INCLUDES {position: 2, recommended: true}]->(p);

MATCH (b:Bundle {id: 'BUNDLE-FAMILY'}), (p:Product {id: 'PROD-TV-BASIC'})
CREATE (b)-[:INCLUDES {position: 3, recommended: false}]->(p);

MATCH (b:Bundle {id: 'BUNDLE-GAMING'}), (p:Product {id: 'PROD-BB-1GB'})
CREATE (b)-[:INCLUDES {position: 1, recommended: true}]->(p);

MATCH (b:Bundle {id: 'BUNDLE-GAMING'}), (p:Product {id: 'PROD-MOB-UNLIM'})
CREATE (b)-[:INCLUDES {position: 2, recommended: true}]->(p);

MATCH (b:Bundle {id: 'BUNDLE-STREAMING'}), (p:Product {id: 'PROD-BB-1GB'})
CREATE (b)-[:INCLUDES {position: 1, recommended: true}]->(p);

MATCH (b:Bundle {id: 'BUNDLE-STREAMING'}), (p:Product {id: 'PROD-TV-PREMIUM'})
CREATE (b)-[:INCLUDES {position: 2, recommended: true}]->(p);

MATCH (b:Bundle {id: 'BUNDLE-STREAMING'}), (p:Product {id: 'PROD-MOB-50GB'})
CREATE (b)-[:INCLUDES {position: 3, recommended: false}]->(p);

// Create relationships: Bundle -> Intent
MATCH (b:Bundle {id: 'BUNDLE-WFH-PREMIUM'}), (i:Intent {name: 'work_from_home'})
CREATE (b)-[:MATCHES_INTENT {strength: 0.95}]->(i);

MATCH (b:Bundle {id: 'BUNDLE-WFH-PREMIUM'}), (i:Intent {name: 'reliability'})
CREATE (b)-[:MATCHES_INTENT {strength: 0.90}]->(i);

MATCH (b:Bundle {id: 'BUNDLE-WFH-PREMIUM'}), (i:Intent {name: 'speed'})
CREATE (b)-[:MATCHES_INTENT {strength: 0.85}]->(i);

MATCH (b:Bundle {id: 'BUNDLE-GAMING'}), (i:Intent {name: 'gaming'})
CREATE (b)-[:MATCHES_INTENT {strength: 0.98}]->(i);

MATCH (b:Bundle {id: 'BUNDLE-GAMING'}), (i:Intent {name: 'speed'})
CREATE (b)-[:MATCHES_INTENT {strength: 0.95}]->(i);

MATCH (b:Bundle {id: 'BUNDLE-STREAMING'}), (i:Intent {name: 'streaming'})
CREATE (b)-[:MATCHES_INTENT {strength: 0.95}]->(i);

MATCH (b:Bundle {id: 'BUNDLE-FAMILY'}), (i:Intent {name: 'family'})
CREATE (b)-[:MATCHES_INTENT {strength: 0.92}]->(i);

// Create relationships: Bundle -> Segment
MATCH (b:Bundle {id: 'BUNDLE-WFH-PREMIUM'}), (s:Segment {name: 'premium'})
CREATE (b)-[:TARGETS_SEGMENT {match_score: 0.95}]->(s);

MATCH (b:Bundle {id: 'BUNDLE-GAMING'}), (s:Segment {name: 'premium'})
CREATE (b)-[:TARGETS_SEGMENT {match_score: 0.90}]->(s);

MATCH (b:Bundle {id: 'BUNDLE-FAMILY'}), (s:Segment {name: 'standard'})
CREATE (b)-[:TARGETS_SEGMENT {match_score: 0.88}]->(s);

MATCH (b:Bundle {id: 'BUNDLE-STREAMING'}), (s:Segment {name: 'standard'})
CREATE (b)-[:TARGETS_SEGMENT {match_score: 0.85}]->(s);

// Create product complementarity relationships
MATCH (p1:Product {type: 'broadband'}), (p2:Product {type: 'mobile'})
CREATE (p1)-[:COMPLEMENTS {strength: 0.90}]->(p2);

MATCH (p1:Product {type: 'broadband'}), (p2:Product {type: 'tv'})
CREATE (p1)-[:COMPLEMENTS {strength: 0.75}]->(p2);

MATCH (p1:Product {type: 'mobile'}), (p2:Product {type: 'tv'})
CREATE (p1)-[:COMPLEMENTS {strength: 0.60}]->(p2);

// Create upgrade/downgrade relationships
MATCH (p1:Product {id: 'PROD-BB-500'}), (p2:Product {id: 'PROD-BB-1GB'})
CREATE (p1)-[:UPGRADES_TO {price_diff: 20.00}]->(p2);

MATCH (p1:Product {id: 'PROD-MOB-50GB'}), (p2:Product {id: 'PROD-MOB-UNLIM'})
CREATE (p1)-[:UPGRADES_TO {price_diff: 10.00}]->(p2);

MATCH (p1:Product {id: 'PROD-TV-BASIC'}), (p2:Product {id: 'PROD-TV-PREMIUM'})
CREATE (p1)-[:UPGRADES_TO {price_diff: 10.00}]->(p2);

// Return summary
MATCH (n) RETURN labels(n)[0] as Type, count(n) as Count ORDER BY Type;
