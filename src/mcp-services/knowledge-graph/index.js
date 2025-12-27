const express = require('express');
const {
  authenticateAPIKey,
  rateLimiter,
  verifyRequestSignature,
  auditLogger,
  healthCheckException
} = require('./auth-middleware');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Apply audit logging to all requests
app.use(auditLogger('knowledge-graph-mcp'));

// Health check endpoint (no authentication required)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'knowledge-graph-mcp-service' });
});

// Apply authentication and rate limiting to MCP endpoints
app.use('/mcp/*', healthCheckException);
app.use('/mcp/*', authenticateAPIKey);
app.use('/mcp/*', rateLimiter({ max: 100, windowMs: 60000 }));
app.use('/mcp/*', verifyRequestSignature);

// MCP tool call endpoint (now protected)
app.post('/mcp/tools/call', (req, res) => {
  const { tool, params } = req.body;

  if (tool === 'find_related_products') {
    // Return mock bundle recommendations
    const bundles = [
      {
        bundle_id: 'BUNDLE-WFH-PREMIUM',
        name: 'Work-from-Home Premium Bundle',
        description: 'Perfect for professionals working from home',
        products: ['broadband', 'mobile'],
        recommended_combo: [
          { product_id: 'PROD-BB-500', name: 'Broadband 500Mbps' },
          { product_id: 'PROD-MOB-50GB', name: 'Mobile 50GB' }
        ],
        bundle_discount: 15,
        total_savings: 10.00,
        popularity_score: 0.92,
        match_score: 0.95
      },
      {
        bundle_id: 'BUNDLE-FAMILY',
        name: 'Family Connect Bundle',
        description: 'Complete connectivity for the whole family',
        products: ['broadband', 'mobile', 'tv'],
        recommended_combo: [
          { product_id: 'PROD-BB-1GB', name: 'Broadband 1Gbps' },
          { product_id: 'PROD-MOB-50GB', name: 'Mobile 50GB' }
        ],
        bundle_discount: 20,
        total_savings: 15.00,
        popularity_score: 0.88,
        match_score: 0.78
      }
    ];

    console.log(`[knowledge-graph-mcp] find_related_products called with base_products: ${JSON.stringify(params.base_products)}`);
    res.json(bundles);
  } else {
    res.status(400).json({ error: 'Unknown tool', tool });
  }
});

app.listen(PORT, () => {
  console.log(`Knowledge Graph MCP Service running on port ${PORT}`);
});
