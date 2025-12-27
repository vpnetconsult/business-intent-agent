import { ClaudeClient } from './claude-client';
import { MCPClient } from './mcp-client';
import { logger } from './logger';
import { maskCustomerProfile, validateNoRawPII, redactForLogs } from './pii-masking';

export class IntentProcessor {
  constructor(
    private claude: ClaudeClient,
    private mcpClients: {
      bss: MCPClient;
      knowledgeGraph: MCPClient;
      customerData: MCPClient;
    }
  ) {}

  async process(customerId: string, intent: string, _context?: any): Promise<any> {
    const startTime = Date.now();

    try {
      // Step 1: Get customer profile
      logger.info({ customerId }, 'Fetching customer profile');
      const customerProfile = await this.mcpClients.customerData.call(
        'get_customer_profile',
        { customer_id: customerId }
      );

      // Step 1.5: Mask PII before sending to external AI service
      logger.info({ customerId }, 'Masking PII data for GDPR compliance');
      const maskedProfile = maskCustomerProfile(customerProfile);

      // Validate no raw PII remains
      const validation = validateNoRawPII(maskedProfile);
      if (!validation.valid) {
        logger.error({ violations: validation.violations }, 'PII validation failed - raw PII detected');
        throw new Error(`PII validation failed: ${validation.violations.join(', ')}`);
      }

      logger.debug({
        originalProfile: redactForLogs(customerProfile),
        maskedProfile
      }, 'Customer profile masked');

      // Step 2: Analyze intent with Claude (using masked profile)
      logger.info({ intent }, 'Analyzing intent with Claude');
      const intentAnalysis = await this.claude.analyzeIntent(intent, maskedProfile);

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

      // Step 5: Generate personalized offer with Claude (using masked profile)
      logger.info('Generating personalized offer');
      const offer = await this.claude.generateOffer({
        intent: intentAnalysis,
        customer: maskedProfile, // Use masked profile, not raw
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
        customer_profile: customerProfile, // Will be filtered by response-filter middleware based on role
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
