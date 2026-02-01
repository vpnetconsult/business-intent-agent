/**
 * Base Agent Implementation for A2A Architecture
 *
 * This module provides the foundation for building specialized agents
 * that participate in agent-to-agent communication.
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';
import {
  AgentIdentity,
  AgentType,
  AgentCard,
  AgentStatus,
  A2AMessage,
  SharedContext,
  TraceContext,
  A2AError,
  ErrorCode,
  Priority,
} from './protocol';

// ============================================================================
// Agent Configuration
// ============================================================================

export interface AgentConfig {
  agentId?: string;
  agentType: AgentType;
  version: string;
  capabilities: string[];
  endpoint: string;
  maxConcurrent?: number;
  timeoutMs?: number;
}

// ============================================================================
// Message Handler Type
// ============================================================================

export type MessageHandler<TRequest, TResponse> = (
  message: A2AMessage<TRequest>,
  context: AgentContext
) => Promise<TResponse>;

export interface AgentContext {
  agent: BaseAgent;
  trace: TraceContext;
  sendMessage: <T, R>(to: AgentType, intent: string, content: T) => Promise<R>;
}

// ============================================================================
// Base Agent Class
// ============================================================================

export abstract class BaseAgent {
  protected readonly identity: AgentIdentity;
  protected readonly handlers: Map<string, MessageHandler<unknown, unknown>> = new Map();
  protected status: AgentStatus = 'unknown';
  private messageBroker?: MessageBroker;
  private registry?: AgentRegistry;

  constructor(protected readonly config: AgentConfig) {
    this.identity = {
      agentId: config.agentId || `${config.agentType}-${uuidv4().slice(0, 8)}`,
      agentType: config.agentType,
      version: config.version,
      endpoint: config.endpoint,
      capabilities: config.capabilities,
    };
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async start(broker: MessageBroker, registry: AgentRegistry): Promise<void> {
    this.messageBroker = broker;
    this.registry = registry;

    // Register with the agent registry
    await registry.register(this.getAgentCard());

    // Subscribe to messages for this agent
    await broker.subscribe(this.identity.agentId, this.handleMessage.bind(this));

    // Initialize agent-specific setup
    await this.onStart();

    this.status = 'healthy';
    logger.info({ agentId: this.identity.agentId }, 'Agent started');
  }

  async stop(): Promise<void> {
    this.status = 'unhealthy';

    // Agent-specific cleanup
    await this.onStop();

    // Deregister from registry
    if (this.registry) {
      await this.registry.deregister(this.identity.agentId);
    }

    logger.info({ agentId: this.identity.agentId }, 'Agent stopped');
  }

  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;

  // ============================================================================
  // Message Handling
  // ============================================================================

  protected registerHandler<TRequest, TResponse>(
    intent: string,
    handler: MessageHandler<TRequest, TResponse>
  ): void {
    this.handlers.set(intent, handler as MessageHandler<unknown, unknown>);
  }

  private async handleMessage(message: A2AMessage): Promise<void> {
    const startTime = Date.now();
    const handler = this.handlers.get(message.intent);

    if (!handler) {
      logger.warn({ intent: message.intent, agentId: this.identity.agentId }, 'Unknown intent');
      await this.sendError(message, 'CAPABILITY_NOT_FOUND', `Unknown intent: ${message.intent}`);
      return;
    }

    try {
      const context = this.createAgentContext(message);
      const result = await handler(message, context);

      // Send response
      await this.sendResponse(message, result);

      logger.info(
        {
          agentId: this.identity.agentId,
          intent: message.intent,
          duration: Date.now() - startTime,
        },
        'Message handled'
      );
    } catch (error: any) {
      logger.error(
        {
          agentId: this.identity.agentId,
          intent: message.intent,
          error: error.message,
        },
        'Message handling failed'
      );
      await this.sendError(message, 'INTERNAL_ERROR', error.message);
    }
  }

  private createAgentContext(message: A2AMessage): AgentContext {
    return {
      agent: this,
      trace: message.trace || this.createTrace(),
      sendMessage: async <T, R>(to: AgentType, intent: string, content: T): Promise<R> => {
        return this.sendRequest(to, intent, content, message.context);
      },
    };
  }

  // ============================================================================
  // Message Sending
  // ============================================================================

  async sendRequest<T, R>(
    toAgentType: AgentType,
    intent: string,
    content: T,
    context?: SharedContext,
    priority: Priority = 'normal'
  ): Promise<R> {
    if (!this.messageBroker || !this.registry) {
      throw new Error('Agent not started');
    }

    // Discover target agent
    const targetAgent = await this.registry.findAgent(toAgentType);
    if (!targetAgent) {
      throw new Error(`No agent found for type: ${toAgentType}`);
    }

    const message: A2AMessage<T> = {
      messageId: uuidv4(),
      correlationId: uuidv4(),
      timestamp: new Date().toISOString(),
      from: this.identity,
      to: {
        agentId: targetAgent.agentId,
        agentType: toAgentType,
        version: targetAgent.version,
        endpoint: targetAgent.endpoint,
        capabilities: targetAgent.capabilities,
      },
      type: 'request',
      intent,
      content,
      conversationId: context?.sessionId || uuidv4(),
      context: context || this.createDefaultContext(),
      priority,
      ttl: this.config.timeoutMs || 30000,
      trace: this.createTrace(),
    };

    logger.debug(
      {
        from: this.identity.agentId,
        to: targetAgent.agentId,
        intent,
      },
      'Sending A2A request'
    );

    return this.messageBroker.request<T, R>(message);
  }

  private async sendResponse<T>(originalMessage: A2AMessage, content: T): Promise<void> {
    if (!this.messageBroker) return;

    const response: A2AMessage<T> = {
      messageId: uuidv4(),
      correlationId: originalMessage.correlationId,
      timestamp: new Date().toISOString(),
      from: this.identity,
      to: originalMessage.from,
      type: 'response',
      intent: originalMessage.intent,
      content,
      conversationId: originalMessage.conversationId,
      parentMessageId: originalMessage.messageId,
      context: originalMessage.context,
      priority: originalMessage.priority,
      ttl: originalMessage.ttl,
      trace: originalMessage.trace,
    };

    await this.messageBroker.send(response);
  }

  private async sendError(
    originalMessage: A2AMessage,
    code: ErrorCode,
    message: string
  ): Promise<void> {
    if (!this.messageBroker) return;

    const error: A2AError = {
      code,
      message,
      agentId: this.identity.agentId,
      timestamp: new Date().toISOString(),
      retryable: ['TIMEOUT', 'AGENT_UNAVAILABLE', 'RATE_LIMITED'].includes(code),
    };

    const errorMessage: A2AMessage<A2AError> = {
      messageId: uuidv4(),
      correlationId: originalMessage.correlationId,
      timestamp: new Date().toISOString(),
      from: this.identity,
      to: originalMessage.from,
      type: 'error',
      intent: originalMessage.intent,
      content: error,
      conversationId: originalMessage.conversationId,
      parentMessageId: originalMessage.messageId,
      context: originalMessage.context,
      priority: 'high',
      ttl: originalMessage.ttl,
      trace: originalMessage.trace,
    };

    await this.messageBroker.send(errorMessage);
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private createDefaultContext(): SharedContext {
    return {
      sessionId: uuidv4(),
      accumulatedFacts: {},
      decisions: [],
      constraints: [],
      piiMasked: false,
    };
  }

  private createTrace(): TraceContext {
    return {
      traceId: uuidv4(),
      spanId: uuidv4(),
      sampled: true,
    };
  }

  getAgentCard(): AgentCard {
    return {
      agentId: this.identity.agentId,
      name: this.identity.agentType,
      description: `${this.identity.agentType} agent`,
      version: this.identity.version,
      capabilities: this.identity.capabilities,
      protocols: ['a2a/1.0'],
      endpoint: this.identity.endpoint,
      authentication: { type: 'mtls' },
      rateLimit: {
        requestsPerMinute: 100,
        maxConcurrent: this.config.maxConcurrent || 10,
      },
      sla: {
        maxLatencyMs: this.config.timeoutMs || 5000,
        availability: 99.9,
      },
      healthEndpoint: `${this.identity.endpoint}/health`,
      status: this.status,
    };
  }

  get id(): string {
    return this.identity.agentId;
  }

  get type(): AgentType {
    return this.identity.agentType;
  }
}

// ============================================================================
// Infrastructure Interfaces
// ============================================================================

export interface MessageBroker {
  subscribe(agentId: string, handler: (message: A2AMessage) => Promise<void>): Promise<void>;
  send<T>(message: A2AMessage<T>): Promise<void>;
  request<T, R>(message: A2AMessage<T>): Promise<R>;
  publish(topic: string, event: unknown): Promise<void>;
}

export interface AgentRegistry {
  register(card: AgentCard): Promise<void>;
  deregister(agentId: string): Promise<void>;
  findAgent(agentType: AgentType): Promise<AgentCard | null>;
  findAgentsByCapability(capability: string): Promise<AgentCard[]>;
  getHealthyAgents(): Promise<AgentCard[]>;
}
