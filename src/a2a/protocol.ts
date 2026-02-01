/**
 * Agent-to-Agent (A2A) Protocol Definitions
 *
 * This module defines the types and interfaces for agent-to-agent
 * communication in the Intent Processing Platform.
 */

// ============================================================================
// Agent Identity
// ============================================================================

export interface AgentIdentity {
  agentId: string;
  agentType: AgentType;
  version: string;
  endpoint: string;
  capabilities: string[];
}

export type AgentType =
  | 'coordinator'
  | 'intent-analyst'
  | 'personalization'
  | 'compliance'
  | 'negotiation'
  | 'customer-data'
  | 'product-catalog'
  | 'knowledge-graph'
  | 'quoting';

// ============================================================================
// A2A Message Protocol
// ============================================================================

export interface A2AMessage<T = unknown> {
  // Header
  messageId: string;
  correlationId: string;
  timestamp: string;

  // Routing
  from: AgentIdentity;
  to: AgentIdentity;
  replyTo?: string;

  // Payload
  type: MessageType;
  intent: string;
  content: T;

  // Context
  conversationId: string;
  parentMessageId?: string;
  context: SharedContext;

  // Metadata
  priority: Priority;
  ttl: number;
  trace?: TraceContext;
}

export type MessageType = 'request' | 'response' | 'event' | 'error';
export type Priority = 'low' | 'normal' | 'high' | 'critical';

// ============================================================================
// Shared Context
// ============================================================================

export interface SharedContext {
  sessionId: string;
  customerId?: string;
  accumulatedFacts: Record<string, unknown>;
  decisions: Decision[];
  constraints: Constraint[];
  piiMasked: boolean;
}

export interface Decision {
  agentId: string;
  decision: string;
  confidence: number;
  reasoning: string;
  timestamp: string;
}

export interface Constraint {
  type: 'budget' | 'compliance' | 'preference' | 'technical';
  name: string;
  value: unknown;
  source: string;
}

// ============================================================================
// Distributed Tracing
// ============================================================================

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
}

// ============================================================================
// Agent Card (Discovery)
// ============================================================================

export interface AgentCard {
  agentId: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  protocols: string[];
  endpoint: string;
  authentication: AuthConfig;
  rateLimit: RateLimitConfig;
  sla: SLAConfig;
  healthEndpoint: string;
  status: AgentStatus;
}

export interface AuthConfig {
  type: 'oauth2' | 'mtls' | 'api-key';
  tokenUrl?: string;
  scopes?: string[];
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  maxConcurrent: number;
  burstLimit?: number;
}

export interface SLAConfig {
  maxLatencyMs: number;
  availability: number;
  errorBudget?: number;
}

export type AgentStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// ============================================================================
// Intent-Specific Message Payloads
// ============================================================================

// Coordinator -> Intent Analyst
export interface AnalyzeIntentRequest {
  text: string;
  language?: string;
  previousIntents?: string[];
}

export interface AnalyzeIntentResponse {
  tags: string[];
  entities: Entity[];
  productTypes: string[];
  sentiment: Sentiment;
  confidence: number;
  reasoning: string;
}

export interface Entity {
  type: string;
  value: string;
  confidence: number;
}

export type Sentiment = 'positive' | 'neutral' | 'negative';

// Coordinator -> Compliance Agent
export interface ValidatePIIRequest {
  profile: Record<string, unknown>;
  requiredMasking: string[];
}

export interface ValidatePIIResponse {
  maskedProfile: Record<string, unknown>;
  maskedFields: string[];
  removedFields: string[];
  complianceStatus: 'passed' | 'failed' | 'warning';
  violations: string[];
}

// Coordinator -> Personalization Agent
export interface GenerateRecommendationsRequest {
  intent: AnalyzeIntentResponse;
  maskedProfile: Record<string, unknown>;
  constraints: Constraint[];
}

export interface GenerateRecommendationsResponse {
  recommendations: Recommendation[];
  bundles: Bundle[];
  reasoning: string;
  confidence: number;
}

export interface Recommendation {
  productId: string;
  productName: string;
  score: number;
  reasons: string[];
}

export interface Bundle {
  bundleId: string;
  name: string;
  products: string[];
  discountPercent: number;
  rdfUri?: string;
}

// Coordinator -> Negotiation Agent
export interface NegotiateOfferRequest {
  recommendations: Recommendation[];
  bundles: Bundle[];
  customerSegment: string;
  budget?: number;
}

export interface NegotiateOfferResponse {
  selectedProducts: string[];
  appliedDiscounts: Discount[];
  totalMonthly: number;
  finalMonthly: number;
  terms: string[];
  validUntil: string;
}

export interface Discount {
  code: string;
  description: string;
  amount: number;
  type: 'percentage' | 'fixed';
}

// ============================================================================
// Agent Workflow Definitions
// ============================================================================

export interface WorkflowStep {
  agent: AgentType;
  action: string;
  timeout: number;
  retries: number;
  fallback?: WorkflowStep;
}

export interface ParallelStep {
  steps: WorkflowStep[];
  aggregation: 'all' | 'any' | 'majority';
}

export interface Workflow {
  id: string;
  name: string;
  steps: (WorkflowStep | ParallelStep)[];
  timeout: number;
  errorHandler?: string;
}

// ============================================================================
// Consensus Protocol
// ============================================================================

export interface ConsensusRequest {
  question: string;
  options: string[];
  voters: AgentType[];
  threshold: number;
  timeout: number;
}

export interface ConsensusVote {
  agentId: string;
  choice: string;
  confidence: number;
  reasoning: string;
}

export interface ConsensusResult {
  achieved: boolean;
  winningChoice?: string;
  votes: ConsensusVote[];
  agreement: number;
}

// ============================================================================
// Error Types
// ============================================================================

export interface A2AError {
  code: ErrorCode;
  message: string;
  agentId: string;
  timestamp: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export type ErrorCode =
  | 'AGENT_UNAVAILABLE'
  | 'TIMEOUT'
  | 'INVALID_MESSAGE'
  | 'CAPABILITY_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'AUTHENTICATION_FAILED'
  | 'CONSENSUS_FAILED'
  | 'WORKFLOW_FAILED'
  | 'INTERNAL_ERROR';

// ============================================================================
// Event Types
// ============================================================================

export type AgentEvent =
  | { type: 'agent.registered'; payload: AgentCard }
  | { type: 'agent.deregistered'; payload: { agentId: string } }
  | { type: 'agent.health.changed'; payload: { agentId: string; status: AgentStatus } }
  | { type: 'workflow.started'; payload: { workflowId: string; conversationId: string } }
  | { type: 'workflow.completed'; payload: { workflowId: string; result: unknown } }
  | { type: 'workflow.failed'; payload: { workflowId: string; error: A2AError } }
  | { type: 'consensus.requested'; payload: ConsensusRequest }
  | { type: 'consensus.completed'; payload: ConsensusResult };
