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
app.use(auditLogger('bss-oss-mcp'));

// Health check endpoint (no authentication required)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'bss-oss-mcp-service' });
});

// Apply authentication and rate limiting to MCP endpoints
app.use('/mcp/*', healthCheckException);
app.use('/mcp/*', authenticateAPIKey);
app.use('/mcp/*', rateLimiter({ max: 100, windowMs: 60000 }));
app.use('/mcp/*', verifyRequestSignature);

// MCP tool call endpoint (now protected)
app.post('/mcp/tools/call', (req, res) => {
  const { tool, params } = req.body;

  if (tool === 'search_product_catalog') {
    // Return mock product catalog results
    const products = [
      {
        product_id: 'PROD-BB-500',
        name: 'Broadband 500Mbps',
        type: 'broadband',
        speed: '500Mbps',
        price: 39.99,
        currency: 'EUR',
        features: ['unlimited_data', 'fiber', 'wifi_router']
      },
      {
        product_id: 'PROD-MOB-50GB',
        name: 'Mobile 50GB',
        type: 'mobile',
        data: '50GB',
        price: 25.00,
        currency: 'EUR',
        features: ['5g', 'unlimited_calls', 'eu_roaming']
      },
      {
        product_id: 'PROD-BB-1GB',
        name: 'Broadband 1Gbps',
        type: 'broadband',
        speed: '1Gbps',
        price: 59.99,
        currency: 'EUR',
        features: ['unlimited_data', 'fiber', 'mesh_wifi', 'priority_support']
      }
    ];

    console.log(`[bss-oss-mcp] search_product_catalog called with intent: ${JSON.stringify(params.intent)}`);
    res.json(products);
  } else if (tool === 'generate_quote') {
    // Return mock quote
    const quote = {
      quote_id: `QTE-${Date.now()}`,
      customer_id: params.customer_id,
      products: params.products || [],
      subtotal: 64.99,
      discounts: params.discounts || [],
      discount_amount: 10.00,
      total_monthly: 54.99,
      currency: 'EUR',
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      terms: '24_month_contract'
    };

    // Sanitize customer_id for logging (prevent log injection)
    const sanitizedCustomerId = String(params.customer_id).replace(/[\r\n]/g, '');
    console.log(`[bss-oss-mcp] generate_quote called for ${sanitizedCustomerId}`);
    res.json(quote);
  } else {
    res.status(400).json({ error: 'Unknown tool', tool });
  }
});

app.listen(PORT, () => {
  console.log(`BSS/OSS MCP Service running on port ${PORT}`);
});
