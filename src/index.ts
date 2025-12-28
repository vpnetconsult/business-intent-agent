import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { ClaudeClient } from './claude-client';
import { MCPClient } from './mcp-client';
import { IntentProcessor } from './intent-processor';
import { TMF921IntentService } from './tmf921/intent-service';
import { createTMF921Router } from './tmf921/routes';
import { logger } from './logger';
import { metricsMiddleware, register } from './metrics';
import { authenticateApiKey, validateCustomerOwnership, generateApiKey } from './auth';
import { validateIntentInput } from './prompt-injection-detection';
import { readRequiredSecret } from './secrets';
import { responseFilterMiddleware, filterInput } from './response-filter';
import * as dotenv from 'dotenv';

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP',
});
app.use('/api/', limiter);

// Metrics middleware
app.use(metricsMiddleware);

// Response filtering middleware (role-based field-level authorization)
app.use(responseFilterMiddleware);

// Initialize Claude client
const claude = new ClaudeClient({
  apiKey: readRequiredSecret('ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY_FILE'),
  model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
  maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4000'),
  temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7'),
});

// Initialize MCP clients
const mcpClients = {
  bss: new MCPClient(process.env.MCP_BSS_URL!),
  knowledgeGraph: new MCPClient(process.env.MCP_KNOWLEDGE_GRAPH_URL!),
  customerData: new MCPClient(process.env.MCP_CUSTOMER_DATA_URL!),
};

// Initialize intent processor
const intentProcessor = new IntentProcessor(claude, mcpClients);

// Initialize TMF921 Intent Management Service
const tmf921IntentService = new TMF921IntentService(intentProcessor);
const tmf921Router = createTMF921Router(tmf921IntentService);

// Mount TMF921 API routes
app.use('/tmf-api/intentManagement/v5', tmf921Router);

logger.info('TMF921 Intent Management API mounted at /tmf-api/intentManagement/v5');

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'business-intent-agent',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe
app.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check MCP server connectivity
    await mcpClients.bss.ping();
    await mcpClients.customerData.ping();
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, 'Readiness check failed');
    res.status(503).json({
      status: 'not ready',
      error: (error as Error).message,
    });
  }
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Admin endpoint to generate API keys (for development/testing)
// Production: This should be replaced with proper admin authentication
app.post('/api/v1/admin/generate-api-key', (req: Request, res: Response) => {
  // Basic protection: require admin secret
  const adminSecret = req.headers['x-admin-secret'];
  const expectedSecret = process.env.ADMIN_SECRET || 'change-me-in-production';

  if (adminSecret !== expectedSecret) {
    logger.warn({ ip: req.ip }, 'Unauthorized API key generation attempt');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid admin secret',
    });
  }

  // Mass assignment protection
  const { filtered, violations } = filterInput(req.body, 'generate_api_key');

  if (violations.length > 0) {
    logger.warn({ violations }, 'Mass assignment protection triggered on admin endpoint');
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Request contains unexpected fields',
      violations,
    });
  }

  const { customerId, name } = filtered;

  if (!customerId || !name) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'customerId and name are required',
    });
  }

  const apiKey = generateApiKey(customerId, name);

  logger.info({ customerId, name }, 'API key generated via admin endpoint');

  res.json({
    apiKey,
    customerId,
    name,
    createdAt: new Date().toISOString(),
    expiresAt: null, // TODO: Implement key expiration
  });
});

// Process customer intent (PROTECTED ENDPOINT)
app.post('/api/v1/intent', authenticateApiKey, validateCustomerOwnership, async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Mass assignment protection - only allow whitelisted fields
    const { filtered, violations } = filterInput(req.body, 'intent');

    if (violations.length > 0) {
      logger.warn({ violations }, 'Mass assignment protection triggered');
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request contains unexpected fields',
        violations,
      });
    }

    const { customerId, intent, context } = filtered;

    if (!customerId || !intent) {
      return res.status(400).json({
        error: 'Missing required fields: customerId, intent',
      });
    }

    // Validate and sanitize intent input (prompt injection detection)
    const validation = validateIntentInput(intent);
    if (!validation.valid) {
      logger.warn({ customerId, error: validation.error }, 'Intent validation failed');
      return res.status(400).json({
        error: 'Invalid input',
        message: validation.error,
      });
    }

    const sanitizedIntent = validation.sanitized || intent;

    logger.info({ customerId, intent: sanitizedIntent }, 'Processing customer intent');

    // Process intent with Claude (using sanitized input)
    const result = await intentProcessor.process(customerId, sanitizedIntent, context);
    
    const processingTime = Date.now() - startTime;
    
    logger.info({
      customerId,
      processingTime,
      offer: result.recommended_offer?.name,
    }, 'Intent processed successfully');
    
    res.json({
      ...result,
      processing_time_ms: processingTime,
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error({
      error: (error as Error).message,
      processingTime,
    }, 'Intent processing failed');
    
    res.status(500).json({
      error: 'Intent processing failed',
      message: (error as Error).message,
      processing_time_ms: processingTime,
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: any) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(port, () => {
  logger.info({ port }, 'Business Intent Agent started');
  logger.info('Claude model: ' + process.env.CLAUDE_MODEL);
  logger.info('Environment: ' + process.env.NODE_ENV);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
