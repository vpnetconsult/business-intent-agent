/**
 * Knowledge Graph MCP Service - RDF Query Tools
 * Version 2.0.0 - TMF620 + Schema.org + RDF Support
 *
 * Updated tools for querying Neo4j RDF-compliant product catalog
 * with TMF620 ProductOffering and BundledProductOffering standards.
 */

import { Driver, Session } from 'neo4j-driver';

/**
 * RDF Product response interface
 */
export interface RDFProduct {
  uri: string;
  id: string;
  name: string;
  description?: string;
  type: string;
  price: number;
  currency: string;
  segment?: string;
  popularity: number;
  aiWeight: number;
}

/**
 * RDF Bundle response interface
 */
export interface RDFBundle {
  uri: string;
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  savings: number;
  discountPercentage: number;
  targetIntent: string;
  popularity: number;
  products: BundleProduct[];
}

/**
 * Bundle product interface
 */
export interface BundleProduct {
  id: string;
  name: string;
  type: string;
  position: number;
  recommended: boolean;
}

/**
 * Knowledge Graph MCP Tools
 */
export class KnowledgeGraphTools {
  constructor(private driver: Driver) {}

  /**
   * Find related products using RDF properties
   *
   * @param productId - Product identifier (e.g., "PROD-BB-500")
   * @returns Array of related products with RDF metadata
   */
  async findRelatedProducts(args: { productId: string }): Promise<RDFProduct[]> {
    const session: Session = this.driver.session();

    try {
      const query = `
        MATCH (p:sch__Product {sch__identifier: $productId})
        MATCH (p)-[:intent__complementsProduct|intent__frequentlyBundledWith]->(related:sch__Product)
        RETURN related.uri AS uri,
               related.sch__identifier AS id,
               related.sch__name AS name,
               related.sch__description AS description,
               related.tmf620__productOfferingType AS type,
               related.intent__priceAmount AS price,
               related.intent__priceCurrency AS currency,
               related.intent__customerSegment AS segment,
               related.intent__popularityScore AS popularity,
               related.intent__aiRecommendationWeight AS aiWeight
        ORDER BY related.intent__aiRecommendationWeight DESC
      `;

      const result = await session.run(query, { productId: args.productId });

      return result.records.map(record => ({
        uri: record.get('uri'),
        id: record.get('id'),
        name: record.get('name'),
        description: record.get('description'),
        type: record.get('type'),
        price: record.get('price'),
        currency: record.get('currency'),
        segment: record.get('segment'),
        popularity: record.get('popularity'),
        aiWeight: record.get('aiWeight')
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Search product catalog with RDF filters
   *
   * @param productType - Optional product type (broadband, mobile, tv)
   * @param maxPrice - Optional maximum price
   * @param segment - Optional customer segment (premium, standard, basic, residential)
   * @param minPopularity - Optional minimum popularity score (0-100)
   * @returns Array of products matching filters
   */
  async searchProductCatalog(args: {
    productType?: string;
    maxPrice?: number;
    segment?: string;
    minPopularity?: number;
  }): Promise<RDFProduct[]> {
    const session: Session = this.driver.session();

    try {
      const query = `
        MATCH (p:tmf620__ProductOffering)
        WHERE p.tmf620__lifecycleStatus = 'Active'
          AND ($productType IS NULL OR p.tmf620__productOfferingType = $productType)
          AND ($maxPrice IS NULL OR p.intent__priceAmount <= $maxPrice)
          AND ($segment IS NULL OR p.intent__customerSegment = $segment)
          AND ($minPopularity IS NULL OR p.intent__popularityScore >= $minPopularity)
        RETURN p.uri AS uri,
               p.sch__identifier AS id,
               p.sch__name AS name,
               p.sch__description AS description,
               p.tmf620__productOfferingType AS type,
               p.intent__priceAmount AS price,
               p.intent__priceCurrency AS currency,
               p.intent__customerSegment AS segment,
               p.intent__popularityScore AS popularity,
               p.intent__aiRecommendationWeight AS aiWeight
        ORDER BY p.intent__aiRecommendationWeight DESC, p.intent__popularityScore DESC
      `;

      const result = await session.run(query, {
        productType: args.productType || null,
        maxPrice: args.maxPrice || null,
        segment: args.segment || null,
        minPopularity: args.minPopularity || null
      });

      return result.records.map(record => ({
        uri: record.get('uri'),
        id: record.get('id'),
        name: record.get('name'),
        description: record.get('description'),
        type: record.get('type'),
        price: record.get('price'),
        currency: record.get('currency'),
        segment: record.get('segment'),
        popularity: record.get('popularity'),
        aiWeight: record.get('aiWeight')
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Get bundle recommendations (NEW TOOL)
   *
   * @param productId - Optional product ID to find bundles containing it
   * @param intent - Optional target intent (work_from_home, family, gaming, streaming)
   * @param maxPrice - Optional maximum bundle price
   * @returns Array of bundles with products
   */
  async getBundleRecommendations(args: {
    productId?: string;
    intent?: string;
    maxPrice?: number;
  }): Promise<RDFBundle[]> {
    const session: Session = this.driver.session();

    try {
      const query = `
        MATCH (b:tmf620__BundledProductOffering)
        WHERE b.tmf620__lifecycleStatus = 'Active'
          AND ($maxPrice IS NULL OR b.intent__bundlePrice <= $maxPrice)
          AND ($intent IS NULL OR b.intent__targetIntent = $intent)
        OPTIONAL MATCH (p:sch__Product {sch__identifier: $productId})
        OPTIONAL MATCH (b)-[inc:tmf620__includes]->(bundleProduct:sch__Product)
        WHERE $productId IS NULL OR bundleProduct.sch__identifier = $productId
        WITH b,
             CASE WHEN $productId IS NULL THEN true ELSE COUNT(bundleProduct) > 0 END AS includesProduct,
             COLLECT({
               id: bundleProduct.sch__identifier,
               name: bundleProduct.sch__name,
               type: bundleProduct.tmf620__productOfferingType,
               position: inc.intent__position,
               recommended: inc.intent__recommended
             }) AS products
        WHERE includesProduct
        RETURN b.uri AS uri,
               b.tmf620__bundleId AS id,
               b.sch__name AS name,
               b.sch__description AS description,
               b.intent__bundlePrice AS price,
               b.intent__originalPrice AS originalPrice,
               b.intent__savings AS savings,
               b.intent__discountPercentage AS discountPercentage,
               b.intent__targetIntent AS targetIntent,
               b.intent__popularityScore AS popularity,
               products
        ORDER BY b.intent__aiRecommendationWeight DESC
      `;

      const result = await session.run(query, {
        productId: args.productId || null,
        intent: args.intent || null,
        maxPrice: args.maxPrice || null
      });

      return result.records.map(record => ({
        uri: record.get('uri'),
        id: record.get('id'),
        name: record.get('name'),
        description: record.get('description'),
        price: record.get('price'),
        originalPrice: record.get('originalPrice'),
        savings: record.get('savings'),
        discountPercentage: record.get('discountPercentage'),
        targetIntent: record.get('targetIntent'),
        popularity: record.get('popularity'),
        products: record.get('products')
      }));
    } finally {
      await session.close();
    }
  }
}
