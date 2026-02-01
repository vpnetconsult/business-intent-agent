/**
 * Prometheus Metrics for Knowledge Graph MCP Service
 * Version 2.0.0
 */

import { Counter, Histogram, Gauge, Registry } from 'prom-client';

export interface Metrics {
  registry: Registry;
  rdfQueriesTotal: Counter;
  rdfQueryDuration: Histogram;
  rdfErrorsTotal: Counter;
  indexUsageRatio: Gauge;
}

/**
 * Create and configure Prometheus metrics
 */
export function createMetrics(): Metrics {
  const registry = new Registry();

  // Counter: Total RDF queries executed
  const rdfQueriesTotal = new Counter({
    name: 'knowledge_graph_rdf_queries_total',
    help: 'Total number of RDF queries executed',
    labelNames: ['tool', 'status'],
    registers: [registry]
  });

  // Histogram: Query duration in milliseconds
  const rdfQueryDuration = new Histogram({
    name: 'knowledge_graph_rdf_queries_duration_ms',
    help: 'RDF query execution time in milliseconds',
    labelNames: ['tool'],
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000],
    registers: [registry]
  });

  // Counter: Query errors
  const rdfErrorsTotal = new Counter({
    name: 'knowledge_graph_rdf_errors_total',
    help: 'Total number of RDF query errors',
    labelNames: ['tool', 'error_type'],
    registers: [registry]
  });

  // Gauge: Index usage ratio
  const indexUsageRatio = new Gauge({
    name: 'knowledge_graph_index_usage_ratio',
    help: 'Ratio of queries using indexes vs table scans',
    registers: [registry]
  });

  return {
    registry,
    rdfQueriesTotal,
    rdfQueryDuration,
    rdfErrorsTotal,
    indexUsageRatio
  };
}

/**
 * Record a metric value
 */
export function recordMetric(
  metrics: Metrics,
  metricName: 'queries' | 'errors',
  labels: Record<string, string>,
  value?: number
): void {
  if (metricName === 'queries') {
    metrics.rdfQueriesTotal.inc(labels, value || 1);
  } else if (metricName === 'errors') {
    metrics.rdfErrorsTotal.inc(labels, value || 1);
  }
}
