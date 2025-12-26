const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'bss-oss-mcp-service' });
});

// MCP tool call endpoint
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

    console.log(`[bss-oss-mcp] generate_quote called for ${params.customer_id}`);
    res.json(quote);
  } else {
    res.status(400).json({ error: 'Unknown tool', tool });
  }
});

app.listen(PORT, () => {
  console.log(`BSS/OSS MCP Service running on port ${PORT}`);
});
