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
app.use(auditLogger('customer-data-mcp'));

// Health check endpoint (no authentication required)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'customer-data-mcp-service' });
});

// Apply authentication and rate limiting to MCP endpoints
app.use('/mcp/*', healthCheckException);
app.use('/mcp/*', authenticateAPIKey);
app.use('/mcp/*', rateLimiter({ max: 100, windowMs: 60000 }));
app.use('/mcp/*', verifyRequestSignature);

// MCP tool call endpoint (now protected)
app.post('/mcp/tools/call', (req, res) => {
  const { tool, params } = req.body;

  if (tool === 'get_customer_profile') {
    // Return mock customer profile
    const profile = {
      customer_id: params.customer_id,
      name: 'John Doe',
      email: 'john.doe@example.com',
      segment: 'premium',
      location: 'Dublin, Ireland',
      contract_type: 'prepaid',
      current_services: ['mobile_basic', 'broadband_100mb'],
      spending_tier: 'high',
      preferences: {
        channel: 'digital',
        language: 'en',
        contact_time: 'evening'
      },
      credit_score: 'excellent'
    };

    console.log(`[customer-data-mcp] get_customer_profile called for ${params.customer_id}`);
    res.json(profile);
  } else {
    res.status(400).json({ error: 'Unknown tool', tool });
  }
});

app.listen(PORT, () => {
  console.log(`Customer Data MCP Service running on port ${PORT}`);
});
