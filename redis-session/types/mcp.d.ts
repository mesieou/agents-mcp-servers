declare module '@modelcontextprotocol/sdk/server/index.js' {
  export class Server {
    constructor(
      serverInfo: {
        name: string;
        version: string;
      },
      capabilities: {
        tools?: {};
      }
    );

    setRequestHandler(schema: any, handler: (request: any) => Promise<any>): void;
    connect(transport: any): Promise<void>;
    onerror?: (error: any) => void;
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export class StdioServerTransport {
    constructor();
  }
}

declare module '@modelcontextprotocol/sdk/types.js' {
  export interface Tool {
    name: string;
    description: string;
    inputSchema: {
      type: string;
      properties?: any;
      required?: string[];
    };
  }

  export interface CallToolResult {
    content: Array<{
      type: string;
      text: string;
    }>;
  }

  export const CallToolRequestSchema: any;
  export const ListToolsRequestSchema: any;
}
