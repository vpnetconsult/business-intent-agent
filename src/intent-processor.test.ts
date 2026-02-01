import { IntentProcessor } from './intent-processor';
import { ClaudeClient } from './claude-client';

describe('IntentProcessor', () => {
  let processor: IntentProcessor;
  let mockClaude: jest.Mocked<ClaudeClient>;
  let mockMcpClients: any;

  beforeEach(() => {
    mockClaude = {
      analyzeIntent: jest.fn(),
      generateOffer: jest.fn(),
    } as any;

    mockMcpClients = {
      bss: { call: jest.fn() },
      knowledgeGraph: { call: jest.fn() },
      customerData: { call: jest.fn() },
    };

    processor = new IntentProcessor(mockClaude, mockMcpClients);
  });

  it('should process intent successfully with full E2E MCP trace', async () => {
    // === STEP 1: Customer Data MCP - Get Customer Profile ===
    console.log('\n=== E2E TRACE: LLM invoking Agentic MCP ===\n');
    console.log('[MCP CALL 1] customer-data-mcp.get_customer_profile');

    mockMcpClients.customerData.call.mockImplementation(async (tool: string, params: any) => {
      console.log(`  -> Tool: ${tool}`);
      console.log(`  -> Params: ${JSON.stringify(params)}`);
      const response = {
        customer_id: 'CUST-123',
        segment: 'Young Professional',
        name: 'John Doe',
        email: 'john.doe@example.com',
        preferences: { communication: 'email' },
      };
      console.log(`  <- Response: ${JSON.stringify(response)}`);
      return response;
    });

    // === STEP 2: Claude LLM - Analyze Intent ===
    console.log('\n[LLM CALL 1] claude.analyzeIntent');

    mockClaude.analyzeIntent.mockImplementation(async (intent: string, profile: any) => {
      console.log(`  -> Intent: "${intent}"`);
      console.log(`  -> Profile (masked): ${JSON.stringify(profile)}`);
      const analysis = {
        tags: ['work_from_home', 'high_bandwidth', 'reliability'],
        product_types: ['broadband', 'mobile'],
        confidence: 0.92,
        reasoning: 'Customer needs reliable internet for remote work',
      };
      console.log(`  <- Analysis: ${JSON.stringify(analysis)}`);
      return analysis;
    });

    // === STEP 3: BSS MCP - Search Product Catalog ===
    // === STEP 4: Knowledge Graph MCP - Find Related Products ===
    // === STEP 6: BSS MCP - Generate Quote ===

    let bssCallCount = 0;
    mockMcpClients.bss.call.mockImplementation(async (tool: string, params: any) => {
      bssCallCount++;
      console.log(`\n[MCP CALL ${bssCallCount + 1}] bss-mcp.${tool}`);
      console.log(`  -> Params: ${JSON.stringify(params)}`);

      if (tool === 'search_product_catalog') {
        const products = [
          { id: 'PROD-001', name: 'Fiber Pro 500Mbps', price: 79.99, category: 'broadband' },
          { id: 'PROD-002', name: 'Mobile Unlimited Plus', price: 49.99, category: 'mobile' },
        ];
        console.log(`  <- Products: ${JSON.stringify(products)}`);
        return products;
      }

      if (tool === 'generate_quote') {
        const quote = {
          quote_id: 'QT-2024-001',
          total_monthly: 119.98,
          discount_applied: 10.00,
          final_monthly: 109.98,
          valid_until: '2024-02-01',
        };
        console.log(`  <- Quote: ${JSON.stringify(quote)}`);
        return quote;
      }

      return {};
    });

    console.log('\n[MCP CALL 3] knowledge-graph-mcp.find_related_products');

    mockMcpClients.knowledgeGraph.call.mockImplementation(async (tool: string, params: any) => {
      console.log(`  -> Tool: ${tool}`);
      console.log(`  -> Params: ${JSON.stringify(params)}`);
      const bundles = [
        {
          bundle_id: 'BND-001',
          name: 'Work From Home Bundle',
          products: ['PROD-001', 'PROD-002'],
          discount_percent: 10,
          rdf_uri: 'http://telco.org/product/BND-001',
        },
      ];
      console.log(`  <- Bundles: ${JSON.stringify(bundles)}`);
      return bundles;
    });

    // === STEP 5: Claude LLM - Generate Personalized Offer ===
    console.log('\n[LLM CALL 2] claude.generateOffer');

    mockClaude.generateOffer.mockImplementation(async (context: any) => {
      console.log(`  -> Context keys: ${Object.keys(context).join(', ')}`);
      console.log(`  -> Products available: ${context.products?.length || 0}`);
      console.log(`  -> Bundles available: ${context.bundles?.length || 0}`);
      const offer = {
        selected_products: ['PROD-001', 'PROD-002'],
        recommended_discounts: ['WFH_BUNDLE_10'],
        personalization_reason: 'Based on work-from-home needs and Young Professional segment',
        confidence: 0.89,
      };
      console.log(`  <- Offer: ${JSON.stringify(offer)}`);
      return offer;
    });

    // === EXECUTE THE FULL E2E FLOW ===
    console.log('\n========================================');
    console.log('EXECUTING INTENT PROCESSOR FLOW');
    console.log('========================================\n');

    const result = await processor.process('CUST-123', 'Need internet for WFH');

    console.log('\n========================================');
    console.log('E2E FLOW COMPLETE');
    console.log('========================================');
    console.log('\nFinal Result:');
    console.log(JSON.stringify(result, null, 2));

    // === VERIFY THE E2E TRACE ===
    expect(result).toBeDefined();
    expect(result.intent_analysis).toBeDefined();
    expect(result.intent_analysis.tags).toContain('work_from_home');
    expect(result.recommended_offer).toBeDefined();
    expect(result.recommended_offer.selected_products).toHaveLength(2);
    expect(result.quote).toBeDefined();
    expect(result.quote.quote_id).toBe('QT-2024-001');

    // Verify MCP call sequence
    expect(mockMcpClients.customerData.call).toHaveBeenCalledWith(
      'get_customer_profile',
      { customer_id: 'CUST-123' }
    );
    expect(mockMcpClients.bss.call).toHaveBeenCalledTimes(2);
    expect(mockMcpClients.knowledgeGraph.call).toHaveBeenCalledTimes(1);
    expect(mockClaude.analyzeIntent).toHaveBeenCalledTimes(1);
    expect(mockClaude.generateOffer).toHaveBeenCalledTimes(1);

    console.log('\n=== E2E TRACE VERIFICATION PASSED ===\n');
  });
});
