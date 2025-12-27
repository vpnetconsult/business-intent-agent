import { IntentProcessor } from '../src/intent-processor';
import { ClaudeClient } from '../src/claude-client';

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

  it('should process intent successfully', async () => {
    mockMcpClients.customerData.call.mockResolvedValue({
      customer_id: 'CUST-123',
      segment: 'Young Professional',
    });

    mockClaude.analyzeIntent.mockResolvedValue({
      tags: ['work_from_home'],
      product_types: ['broadband', 'mobile'],
    });

    mockMcpClients.bss.call.mockResolvedValue([
      { id: 'PROD-1', name: 'Broadband 500Mbps' },
    ]);

    const result = await processor.process('CUST-123', 'Need internet for WFH');

    expect(result).toBeDefined();
    expect(result.intent_analysis).toBeDefined();
  });
});
