/**
 * Intent Analyst Agent
 *
 * Specialized agent for analyzing customer intents using NLU.
 * Uses Claude LLM for natural language understanding.
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseAgent, AgentConfig, AgentContext } from '../agent';
import {
  A2AMessage,
  AnalyzeIntentRequest,
  AnalyzeIntentResponse,
  Entity,
  Sentiment,
} from '../protocol';
import { logger } from '../../logger';

const INTENT_ANALYSIS_PROMPT = `You are an intent analysis agent for a telecommunications company.
Analyze the customer's message and extract:
1. Intent tags (e.g., work_from_home, entertainment, gaming, business, family)
2. Named entities (products, services, locations, quantities)
3. Product types needed (broadband, mobile, tv, landline, security)
4. Sentiment (positive, neutral, negative)
5. Confidence score (0-1)

Respond in JSON format:
{
  "tags": ["tag1", "tag2"],
  "entities": [{"type": "product", "value": "fiber", "confidence": 0.9}],
  "productTypes": ["broadband", "mobile"],
  "sentiment": "neutral",
  "confidence": 0.85,
  "reasoning": "Brief explanation of the analysis"
}`;

export class IntentAnalystAgent extends BaseAgent {
  private anthropic: Anthropic;

  constructor(config: Partial<AgentConfig> = {}) {
    super({
      agentType: 'intent-analyst',
      version: '2.0.0',
      capabilities: [
        'intent_classification',
        'entity_extraction',
        'sentiment_analysis',
        'multi_turn_context',
      ],
      endpoint: process.env.INTENT_ANALYST_ENDPOINT || 'http://localhost:3001',
      maxConcurrent: 20,
      timeoutMs: 5000,
      ...config,
    });

    this.anthropic = new Anthropic();
  }

  protected async onStart(): Promise<void> {
    // Register message handlers
    this.registerHandler<AnalyzeIntentRequest, AnalyzeIntentResponse>(
      'analyze_intent',
      this.handleAnalyzeIntent.bind(this)
    );

    this.registerHandler<{ intents: string[] }, { merged: AnalyzeIntentResponse }>(
      'merge_intents',
      this.handleMergeIntents.bind(this)
    );

    logger.info({ agentId: this.id }, 'Intent Analyst Agent initialized');
  }

  protected async onStop(): Promise<void> {
    logger.info({ agentId: this.id }, 'Intent Analyst Agent stopping');
  }

  // ============================================================================
  // Intent Analysis Handler
  // ============================================================================

  private async handleAnalyzeIntent(
    message: A2AMessage<AnalyzeIntentRequest>,
    context: AgentContext
  ): Promise<AnalyzeIntentResponse> {
    const { text, language, previousIntents } = message.content;

    logger.info(
      {
        agentId: this.id,
        textLength: text.length,
        language,
        hasPreviousContext: !!previousIntents?.length,
      },
      'Analyzing customer intent'
    );

    // Build context from previous intents if available
    const contextPrompt = previousIntents?.length
      ? `\nPrevious intents in this conversation: ${previousIntents.join(', ')}`
      : '';

    // Call Claude for intent analysis
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: INTENT_ANALYSIS_PROMPT + contextPrompt,
      messages: [
        {
          role: 'user',
          content: `Analyze this customer message: "${text}"`,
        },
      ],
    });

    // Parse the response
    const analysisText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      const analysis = JSON.parse(analysisText);

      // Validate and normalize the response
      const result: AnalyzeIntentResponse = {
        tags: this.validateTags(analysis.tags),
        entities: this.validateEntities(analysis.entities),
        productTypes: this.validateProductTypes(analysis.productTypes),
        sentiment: this.validateSentiment(analysis.sentiment),
        confidence: this.validateConfidence(analysis.confidence),
        reasoning: analysis.reasoning || 'No reasoning provided',
      };

      // Record decision in shared context
      message.context.decisions.push({
        agentId: this.id,
        decision: `Classified intent with tags: ${result.tags.join(', ')}`,
        confidence: result.confidence,
        reasoning: result.reasoning,
        timestamp: new Date().toISOString(),
      });

      logger.info(
        {
          agentId: this.id,
          tags: result.tags,
          confidence: result.confidence,
        },
        'Intent analysis complete'
      );

      return result;
    } catch (error) {
      logger.error({ error, response: analysisText }, 'Failed to parse intent analysis');
      throw new Error('Failed to parse intent analysis response');
    }
  }

  // ============================================================================
  // Intent Merging Handler (for multi-turn conversations)
  // ============================================================================

  private async handleMergeIntents(
    message: A2AMessage<{ intents: string[] }>,
    _context: AgentContext
  ): Promise<{ merged: AnalyzeIntentResponse }> {
    const { intents } = message.content;

    // Use Claude to merge multiple intents into a coherent understanding
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are merging multiple customer intents from a conversation into a single coherent intent analysis. ${INTENT_ANALYSIS_PROMPT}`,
      messages: [
        {
          role: 'user',
          content: `Merge these intents into one analysis: ${intents.join('\n')}`,
        },
      ],
    });

    const analysisText =
      response.content[0].type === 'text' ? response.content[0].text : '';
    const analysis = JSON.parse(analysisText);

    return {
      merged: {
        tags: this.validateTags(analysis.tags),
        entities: this.validateEntities(analysis.entities),
        productTypes: this.validateProductTypes(analysis.productTypes),
        sentiment: this.validateSentiment(analysis.sentiment),
        confidence: this.validateConfidence(analysis.confidence),
        reasoning: analysis.reasoning,
      },
    };
  }

  // ============================================================================
  // Validation Helpers
  // ============================================================================

  private validateTags(tags: unknown): string[] {
    if (!Array.isArray(tags)) return [];
    return tags.filter((t) => typeof t === 'string').slice(0, 10);
  }

  private validateEntities(entities: unknown): Entity[] {
    if (!Array.isArray(entities)) return [];
    return entities
      .filter(
        (e) =>
          typeof e === 'object' &&
          e !== null &&
          typeof (e as Entity).type === 'string' &&
          typeof (e as Entity).value === 'string'
      )
      .map((e) => ({
        type: (e as Entity).type,
        value: (e as Entity).value,
        confidence: typeof (e as Entity).confidence === 'number' ? (e as Entity).confidence : 0.5,
      }))
      .slice(0, 20);
  }

  private validateProductTypes(types: unknown): string[] {
    const validTypes = ['broadband', 'mobile', 'tv', 'landline', 'security', 'bundle'];
    if (!Array.isArray(types)) return [];
    return types.filter((t) => typeof t === 'string' && validTypes.includes(t));
  }

  private validateSentiment(sentiment: unknown): Sentiment {
    if (sentiment === 'positive' || sentiment === 'neutral' || sentiment === 'negative') {
      return sentiment;
    }
    return 'neutral';
  }

  private validateConfidence(confidence: unknown): number {
    if (typeof confidence === 'number' && confidence >= 0 && confidence <= 1) {
      return confidence;
    }
    return 0.5;
  }
}

// Factory function for creating the agent
export function createIntentAnalystAgent(config?: Partial<AgentConfig>): IntentAnalystAgent {
  return new IntentAnalystAgent(config);
}
