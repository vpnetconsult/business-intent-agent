import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

export const register = new client.Registry();

// Default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const intentProcessingDuration = new client.Histogram({
  name: 'intent_processing_duration_seconds',
  help: 'Duration of intent processing in seconds',
  registers: [register],
});

export const claudeApiCalls = new client.Counter({
  name: 'claude_api_calls_total',
  help: 'Total number of Claude API calls',
  labelNames: ['operation'],
  registers: [register],
});

export const mcpCalls = new client.Counter({
  name: 'mcp_calls_total',
  help: 'Total number of MCP calls',
  labelNames: ['server', 'tool', 'status'],
  registers: [register],
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);
  });

  next();
};
