/**
 * Knowledge Graph MCP Server
 * Version 2.0.0 - RDF Support
 *
 * MCP server for querying Neo4j RDF-compliant product catalog
 * with TMF620 and Schema.org standards.
 */

import express, { Request, Response } from 'express';
import neo4j, { Driver } from 'neo4j-driver';
import { KnowledgeGraphTools } from './tools';
import { createMetrics, recordMetric } from './metrics';

const app = express();
app.use(express.json());

// Neo4j connection - credentials must be provided via environment variables
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

if (!NEO4J_PASSWORD) {
  console.error('FATAL: NEO4J_PASSWORD environment variable is required');
  process.exit(1);
}

const driver: Driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
  {
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 10000
  }
);

// Initialize tools
const tools = new KnowledgeGraphTools(driver);

// Initialize Prometheus metrics
const metrics = createMetrics();

/**
 * Health check endpoint
 */
app.get('/health', async (req: Request, res: Response) => {
  try {
    const session = driver.session();
    await session.run('RETURN 1');
    await session.close();
    res.json({ status: 'healthy', version: '2.0.0', timestamp: new Date().toISOString() });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(503).json({ status: 'unhealthy', error: errorMessage });
  }
});

/**
 * Readiness check endpoint
 */
app.get('/ready', async (req: Request, res: Response) => {
  try {
    const session = driver.session();
    // Verify RDF indexes exist
    const result = await session.run(`
      SHOW INDEXES
      YIELD name, state
      WHERE name STARTS WITH 'rdf_'
         OR name STARTS WITH 'tmf620_'
         OR name STARTS WITH 'intent_'
         OR name STARTS WITH 'dc_'
         OR name CONTAINS 'fulltext'
      RETURN count(name) AS indexCount
    `);
    await session.close();

    const indexCount = result.records[0]?.get('indexCount').toNumber() || 0;

    if (indexCount >= 17) {
      res.json({ ready: true, indexes: indexCount });
    } else {
      res.status(503).json({ ready: false, indexes: indexCount, required: 17 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(503).json({ ready: false, error: errorMessage });
  }
});

/**
 * Metrics endpoint for Prometheus
 */
app.get('/metrics', async (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  res.send(await metrics.registry.metrics());
});

/**
 * MCP Tool: find_related_products
 */
app.post('/mcp/tools/find_related_products', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    const results = await tools.findRelatedProducts({ productId });

    // Record metrics
    metrics.rdfQueriesTotal.inc({ tool: 'find_related_products', status: 'success' });
    metrics.rdfQueryDuration.observe(
      { tool: 'find_related_products' },
      Date.now() - startTime
    );

    res.json({
      tool: 'find_related_products',
      results,
      count: results.length,
      executionTimeMs: Date.now() - startTime
    });
  } catch (error) {
    const errorCode = error instanceof Error && 'code' in error ? (error as any).code : 'unknown';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    metrics.rdfErrorsTotal.inc({
      tool: 'find_related_products',
      error_type: errorCode
    });

    res.status(500).json({
      error: errorMessage,
      tool: 'find_related_products'
    });
  }
});

/**
 * MCP Tool: search_product_catalog
 */
app.post('/mcp/tools/search_product_catalog', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { productType, maxPrice, segment, minPopularity } = req.body;

    const results = await tools.searchProductCatalog({
      productType,
      maxPrice,
      segment,
      minPopularity
    });

    // Record metrics
    metrics.rdfQueriesTotal.inc({ tool: 'search_product_catalog', status: 'success' });
    metrics.rdfQueryDuration.observe(
      { tool: 'search_product_catalog' },
      Date.now() - startTime
    );

    res.json({
      tool: 'search_product_catalog',
      results,
      count: results.length,
      filters: { productType, maxPrice, segment, minPopularity },
      executionTimeMs: Date.now() - startTime
    });
  } catch (error) {
    const errorCode = error instanceof Error && 'code' in error ? (error as any).code : 'unknown';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    metrics.rdfErrorsTotal.inc({
      tool: 'search_product_catalog',
      error_type: errorCode
    });

    res.status(500).json({
      error: errorMessage,
      tool: 'search_product_catalog'
    });
  }
});

/**
 * MCP Tool: get_bundle_recommendations (NEW)
 */
app.post('/mcp/tools/get_bundle_recommendations', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { productId, intent, maxPrice } = req.body;

    const results = await tools.getBundleRecommendations({
      productId,
      intent,
      maxPrice
    });

    // Record metrics
    metrics.rdfQueriesTotal.inc({ tool: 'get_bundle_recommendations', status: 'success' });
    metrics.rdfQueryDuration.observe(
      { tool: 'get_bundle_recommendations' },
      Date.now() - startTime
    );

    res.json({
      tool: 'get_bundle_recommendations',
      results,
      count: results.length,
      filters: { productId, intent, maxPrice },
      executionTimeMs: Date.now() - startTime
    });
  } catch (error) {
    const errorCode = error instanceof Error && 'code' in error ? (error as any).code : 'unknown';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    metrics.rdfErrorsTotal.inc({
      tool: 'get_bundle_recommendations',
      error_type: errorCode
    });

    res.status(500).json({
      error: errorMessage,
      tool: 'get_bundle_recommendations'
    });
  }
});

/**
 * List available MCP tools
 */
app.get('/mcp/tools', (req: Request, res: Response) => {
  res.json({
    version: '2.0.0',
    tools: [
      {
        name: 'find_related_products',
        description: 'Find products related to a given product using RDF relationships',
        parameters: {
          productId: { type: 'string', required: true, description: 'Product identifier (e.g., PROD-BB-500)' }
        }
      },
      {
        name: 'search_product_catalog',
        description: 'Search product catalog with RDF filters',
        parameters: {
          productType: { type: 'string', required: false, description: 'Product type: broadband, mobile, tv' },
          maxPrice: { type: 'number', required: false, description: 'Maximum price filter' },
          segment: { type: 'string', required: false, description: 'Customer segment: premium, standard, basic, residential' },
          minPopularity: { type: 'number', required: false, description: 'Minimum popularity score (0-100)' }
        }
      },
      {
        name: 'get_bundle_recommendations',
        description: 'Get bundle recommendations with optional filters (NEW in v2.0)',
        parameters: {
          productId: { type: 'string', required: false, description: 'Find bundles containing this product' },
          intent: { type: 'string', required: false, description: 'Target intent: work_from_home, family, gaming, streaming' },
          maxPrice: { type: 'number', required: false, description: 'Maximum bundle price' }
        }
      }
    ]
  });
});

/**
 * Server lifecycle
 */
const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, () => {
  console.log(`Knowledge Graph MCP Service v2.0.0 listening on port ${PORT}`);
  console.log(`Neo4j: ${NEO4J_URI}`);
  console.log(`Endpoints:`);
  console.log(`  - GET  /health`);
  console.log(`  - GET  /ready`);
  console.log(`  - GET  /metrics`);
  console.log(`  - GET  /mcp/tools`);
  console.log(`  - POST /mcp/tools/find_related_products`);
  console.log(`  - POST /mcp/tools/search_product_catalog`);
  console.log(`  - POST /mcp/tools/get_bundle_recommendations`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  server.close(async () => {
    console.log('Server closed');
    await driver.close();
    console.log('Neo4j driver closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');
  server.close(async () => {
    console.log('Server closed');
    await driver.close();
    console.log('Neo4j driver closed');
    process.exit(0);
  });
});

export default app;
