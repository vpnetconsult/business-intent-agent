/**
 * Agent-to-Agent (A2A) Module
 *
 * This module provides the foundation for building multi-agent systems
 * with agent-to-agent communication capabilities.
 */

// Protocol definitions
export * from './protocol';

// Base agent class
export { BaseAgent, AgentConfig, AgentContext, MessageHandler } from './agent';
export type { MessageBroker, AgentRegistry } from './agent';

// Specialized agents
export { IntentAnalystAgent, createIntentAnalystAgent } from './agents/intent-analyst-agent';
