import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';

export class MCPClient {
  private client: AxiosInstance;
  private baseURL: string;
  private apiKey: string;

  constructor(baseURL: string, apiKey?: string) {
    this.baseURL = baseURL;
    this.apiKey = apiKey || process.env.MCP_API_KEY_BUSINESS_INTENT || '';

    if (!this.apiKey) {
      logger.warn({ baseURL }, 'MCP Client initialized without API key');
    }

    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
    });
  }

  async call(tool: string, params: any): Promise<any> {
    try {
      const response = await this.client.post('/mcp/tools/call', {
        tool,
        params,
      });
      return response.data;
    } catch (error: any) {
      logger.error({ tool, error: error.message }, 'MCP call failed');
      throw error;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
