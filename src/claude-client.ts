import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export class ClaudeClient {
  private client: Anthropic;
  private config: ClaudeConfig;

  constructor(config: ClaudeConfig) {
    this.config = config;
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  private parseJsonResponse(text: string): any {
    // Remove markdown code blocks if present
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    return JSON.parse(cleaned.trim());
  }

  async analyzeIntent(intent: string, customerProfile: any): Promise<any> {
    const prompt = `Analyze this customer intent and extract key information:

Customer Intent: "${intent}"

Customer Profile:
- Segment: ${customerProfile.segment}
- Current Services: ${JSON.stringify(customerProfile.current_services)}
- Tenure: ${customerProfile.tenure}

Extract:
1. Intent tags (e.g., work_from_home, gaming, streaming)
2. Product types needed (e.g., broadband, mobile, tv)
3. Priority requirements (e.g., speed, reliability, price)

Return ONLY valid JSON, no markdown formatting.`;

    const message = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return this.parseJsonResponse(content.text);
    }
    throw new Error('Unexpected response format');
  }

  async generateOffer(params: any): Promise<any> {
    const prompt = `Generate a personalized product offer:

Customer Intent: ${JSON.stringify(params.intent)}
Available Products: ${JSON.stringify(params.products)}
Recommended Bundles: ${JSON.stringify(params.bundles)}
Customer Segment: ${params.customer.segment}

Create an optimal offer including:
1. Selected products
2. Bundle recommendation
3. Pricing strategy
4. Promotional discounts

Return ONLY valid JSON, no markdown formatting.`;

    const message = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = message.content[0];
    if (content.type === 'text') {
      return this.parseJsonResponse(content.text);
    }
    throw new Error('Unexpected response format');
  }
}
