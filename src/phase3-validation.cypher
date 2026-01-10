// Phase 3: Data Validation Queries (SHACL-inspired)
// TMF620 ProductOffering and BundledProductOffering Validation

// ==========================================
// VALIDATION 1: Check all products have required properties
// ==========================================

CALL {
  // Check ProductOffering required properties
  MATCH (p:tmf620__ProductOffering)
  WHERE p.tmf620__productOfferingId IS NULL
     OR p.tmf620__productOfferingType IS NULL
     OR p.tmf620__lifecycleStatus IS NULL
     OR p.sch__name IS NULL
     OR p.sch__identifier IS NULL
     OR p.intent__popularityScore IS NULL
     OR p.intent__aiRecommendationWeight IS NULL
  RETURN 'MISSING_REQUIRED_PROPERTIES' AS validationType,
         p.uri AS entity,
         'ProductOffering' AS entityType,
         'ERROR' AS severity,
         'Product missing required properties' AS message
}
UNION
CALL {
  // Check BundledProductOffering required properties
  MATCH (b:tmf620__BundledProductOffering)
  WHERE b.tmf620__bundleId IS NULL
     OR b.tmf620__lifecycleStatus IS NULL
     OR b.sch__name IS NULL
     OR b.sch__identifier IS NULL
     OR b.intent__discountPercentage IS NULL
     OR b.intent__bundlePrice IS NULL
  RETURN 'MISSING_REQUIRED_PROPERTIES' AS validationType,
         b.uri AS entity,
         'BundledProductOffering' AS entityType,
         'ERROR' AS severity,
         'Bundle missing required properties' AS message
}
UNION
// ==========================================
// VALIDATION 2: Check product type values
// ==========================================
CALL {
  MATCH (p:tmf620__ProductOffering)
  WHERE NOT p.tmf620__productOfferingType IN ['broadband', 'mobile', 'tv']
  RETURN 'INVALID_PRODUCT_TYPE' AS validationType,
         p.uri AS entity,
         'ProductOffering' AS entityType,
         'ERROR' AS severity,
         'Invalid product type: ' + p.tmf620__productOfferingType AS message
}
UNION
// ==========================================
// VALIDATION 3: Check lifecycle status values
// ==========================================
CALL {
  MATCH (p:Resource)
  WHERE (p:tmf620__ProductOffering OR p:tmf620__BundledProductOffering)
    AND NOT p.tmf620__lifecycleStatus IN ['Active', 'Deprecated', 'Retired', 'Draft']
  RETURN 'INVALID_LIFECYCLE_STATUS' AS validationType,
         p.uri AS entity,
         CASE WHEN p:tmf620__ProductOffering THEN 'ProductOffering'
              ELSE 'BundledProductOffering' END AS entityType,
         'ERROR' AS severity,
         'Invalid lifecycle status: ' + p.tmf620__lifecycleStatus AS message
}
UNION
// ==========================================
// VALIDATION 4: Check popularity score range (0-100)
// ==========================================
CALL {
  MATCH (p:Resource)
  WHERE p.intent__popularityScore IS NOT NULL
    AND (p.intent__popularityScore < 0 OR p.intent__popularityScore > 100)
  RETURN 'INVALID_POPULARITY_SCORE' AS validationType,
         p.uri AS entity,
         CASE WHEN p:tmf620__ProductOffering THEN 'ProductOffering'
              ELSE 'BundledProductOffering' END AS entityType,
         'ERROR' AS severity,
         'Popularity score out of range (0-100): ' + toString(p.intent__popularityScore) AS message
}
UNION
// ==========================================
// VALIDATION 5: Check AI recommendation weight range (0.0-1.0)
// ==========================================
CALL {
  MATCH (p:Resource)
  WHERE p.intent__aiRecommendationWeight IS NOT NULL
    AND (p.intent__aiRecommendationWeight < 0.0 OR p.intent__aiRecommendationWeight > 1.0)
  RETURN 'INVALID_AI_WEIGHT' AS validationType,
         p.uri AS entity,
         CASE WHEN p:tmf620__ProductOffering THEN 'ProductOffering'
              ELSE 'BundledProductOffering' END AS entityType,
         'ERROR' AS severity,
         'AI weight out of range (0.0-1.0): ' + toString(p.intent__aiRecommendationWeight) AS message
}
UNION
// ==========================================
// VALIDATION 6: Check price amount is positive
// ==========================================
CALL {
  MATCH (p:tmf620__ProductOffering)
  WHERE p.intent__priceAmount IS NOT NULL AND p.intent__priceAmount <= 0
  RETURN 'INVALID_PRICE_AMOUNT' AS validationType,
         p.uri AS entity,
         'ProductOffering' AS entityType,
         'ERROR' AS severity,
         'Price must be positive: ' + toString(p.intent__priceAmount) AS message
}
UNION
// ==========================================
// VALIDATION 7: Bundle price must be less than original price
// ==========================================
CALL {
  MATCH (b:tmf620__BundledProductOffering)
  WHERE b.intent__bundlePrice >= b.intent__originalPrice
  RETURN 'BUNDLE_PRICE_NOT_DISCOUNTED' AS validationType,
         b.uri AS entity,
         'BundledProductOffering' AS entityType,
         'ERROR' AS severity,
         'Bundle price (' + toString(b.intent__bundlePrice) +
         ') must be less than original price (' + toString(b.intent__originalPrice) + ')' AS message
}
UNION
// ==========================================
// VALIDATION 8: Bundle savings should match calculation
// ==========================================
CALL {
  MATCH (b:tmf620__BundledProductOffering)
  WHERE abs((b.intent__originalPrice - b.intent__bundlePrice) - b.intent__savings) > 0.01
  RETURN 'BUNDLE_SAVINGS_MISMATCH' AS validationType,
         b.uri AS entity,
         'BundledProductOffering' AS entityType,
         'WARNING' AS severity,
         'Savings mismatch: declared=' + toString(b.intent__savings) +
         ', calculated=' + toString(b.intent__originalPrice - b.intent__bundlePrice) AS message
}
UNION
// ==========================================
// VALIDATION 9: Bundle discount percentage validation
// ==========================================
CALL {
  MATCH (b:tmf620__BundledProductOffering)
  WHERE b.intent__discountPercentage < 0 OR b.intent__discountPercentage > 100
  RETURN 'INVALID_DISCOUNT_PERCENTAGE' AS validationType,
         b.uri AS entity,
         'BundledProductOffering' AS entityType,
         'ERROR' AS severity,
         'Discount percentage out of range (0-100): ' + toString(b.intent__discountPercentage) AS message
}
UNION
// ==========================================
// VALIDATION 10: Bundle must include at least 2 products
// ==========================================
CALL {
  MATCH (b:tmf620__BundledProductOffering)
  OPTIONAL MATCH (b)-[:tmf620__includes]->(p:sch__Product)
  WITH b, count(p) AS productCount
  WHERE productCount < 2
  RETURN 'BUNDLE_INSUFFICIENT_PRODUCTS' AS validationType,
         b.uri AS entity,
         'BundledProductOffering' AS entityType,
         'ERROR' AS severity,
         'Bundle must include at least 2 products, found: ' + toString(productCount) AS message
}
UNION
// ==========================================
// VALIDATION 11: Upgrade relationships must have positive price difference
// ==========================================
CALL {
  MATCH (p1)-[r:intent__upgradesTo]->(p2)
  WHERE r.intent__upgradePriceDifference <= 0
  RETURN 'INVALID_UPGRADE_PRICE_DIFF' AS validationType,
         p1.uri AS entity,
         'UpgradeRelationship' AS entityType,
         'ERROR' AS severity,
         'Upgrade price difference must be positive: ' + toString(r.intent__upgradePriceDifference) AS message
}
UNION
// ==========================================
// VALIDATION 12: Check URI format
// ==========================================
CALL {
  MATCH (r:Resource)
  WHERE r.uri IS NULL
     OR NOT r.uri STARTS WITH 'https://intent-platform.example.com/'
  RETURN 'INVALID_URI_FORMAT' AS validationType,
         r.uri AS entity,
         'Resource' AS entityType,
         'ERROR' AS severity,
         'URI must start with platform domain' AS message
}
RETURN validationType, entity, entityType, severity, message
ORDER BY severity DESC, validationType;
