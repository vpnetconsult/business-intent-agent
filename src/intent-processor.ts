import { ClaudeClient } from './claude-client';
import { MCPClient } from './mcp-client';
import { logger } from './logger';

export class IntentProcessor {
  constructor(
    private claude: ClaudeClient,
    private mcpClients: {
      bss: MCPClient;
      knowledgeGraph: MCPClient;
      customerData: MCPClient;
    }
  ) {}

  async process(customerId: string, intent: string, context?: any): Promise<any> {
    const startTime = Date.now();

    try {
      // Step 1: Get customer profile
      logger.info({ customerId }, 'Fetching customer profile');
      const customerProfile = await this.mcpClients.customerData.call(
        'get_customer_profile',
        { customer_id: customerId }
      );

      // Step 2: Analyze intent with Claude
      logger.info({ intent }, 'Analyzing intent with Claude');
      const intentAnalysis = await this.claude.analyzeIntent(intent, customerProfile);

      // Step 3: Search product catalog
      logger.info({ tags: intentAnalysis.tags }, 'Searching product catalog');
      const products = await this.mcpClients.bss.call(
        'search_product_catalog',
        {
          intent: intentAnalysis.tags,
          customer_segment: customerProfile.segment,
        }
      );

      // Step 4: Find related products (bundles)
      logger.info({ productTypes: intentAnalysis.product_types }, 'Finding bundles');
      const bundles = await this.mcpClients.knowledgeGraph.call(
        'find_related_products',
        { base_products: intentAnalysis.product_types }
      );

      // Step 5: Generate personalized offer with Claude
      logger.info('Generating personalized offer');
      const offer = await this.claude.generateOffer({
        intent: intentAnalysis,
        customer: customerProfile,
        products,
        bundles,
      });

      // Step 6: Generate quote
      logger.info({ products: offer.selected_products }, 'Generating quote');
      const quote = await this.mcpClients.bss.call(
        'generate_quote',
        {
          customer_id: customerId,
          products: offer.selected_products,
          discounts: offer.recommended_discounts,
        }
      );

      const processingTime = Date.now() - startTime;

      return {
        intent_analysis: intentAnalysis,
        customer_profile: customerProfile,
        recommended_offer: offer,
        quote: quote,
        processing_time_ms: processingTime,
      };
    } catch (error: any) {
      logger.error({ error: error.message, customerId }, 'Intent processing failed');
      throw error;
    }
  }
}
