import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';

export class MCPClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
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
    } catch (error) {
      return false;
    }
  }
}
