// Global type declarations for MCP Redis Server

declare module 'redis' {
  export interface RedisClientOptions {
    socket?: {
      host?: string;
      port?: number;
      reconnectStrategy?: (retries: number) => number;
    };
    database?: number;
    password?: string;
  }

  export interface RedisClientType {
    connect(): Promise<void>;
    quit(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<string>;
    setEx(key: string, seconds: number, value: string): Promise<string>;
    del(key: string): Promise<number>;
    exists(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<boolean>;
    ttl(key: string): Promise<number>;
    hGet(key: string, field: string): Promise<string | undefined>;
    hSet(key: string, field: string, value: string): Promise<number>;
    hGetAll(key: string): Promise<Record<string, string>>;
    hDel(key: string, field: string): Promise<number>;
    lPush(key: string, values: string[]): Promise<number>;
    rPush(key: string, values: string[]): Promise<number>;
    lRange(key: string, start: number, stop: number): Promise<string[]>;
    lLen(key: string): Promise<number>;
    lRem(key: string, count: number, value: string): Promise<number>;
    sAdd(key: string, members: string[]): Promise<number>;
    sMembers(key: string): Promise<string[]>;
    sRem(key: string, members: string[]): Promise<number>;
    keys(pattern: string): Promise<string[]>;
    multi(): any;
    [key: string]: any; // Allow additional properties
  }

  export function createClient(options?: RedisClientOptions): any;
}

declare module 'dotenv' {
  export interface DotenvConfigOptions {
    path?: string;
    encoding?: string;
    debug?: boolean;
  }

  export interface DotenvConfigOutput {
    parsed?: { [key: string]: string };
    error?: Error;
  }

  export function config(options?: DotenvConfigOptions): DotenvConfigOutput;
}

declare module '@modelcontextprotocol/sdk/server/index.js' {
  export interface ServerInfo {
    name: string;
    version: string;
  }

  export interface ServerOptions {
    tools?: {};
    [key: string]: any; // Allow additional properties
  }

  export class Server {
    constructor(
      serverInfo: ServerInfo,
      options?: ServerOptions
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

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      REDIS_HOST?: string;
      REDIS_PORT?: string;
      REDIS_PASSWORD?: string;
      REDIS_DB?: string;
      MCP_SERVER_NAME?: string;
      MCP_SERVER_VERSION?: string;
      CACHE_TTL?: string;
      BATCH_SIZE?: string;
      MAX_CONNECTIONS?: string;
      LOG_LEVEL?: string;
    }
  }

  var process: NodeJS.Process;
  var console: Console;
  var setInterval: (callback: (...args: any[]) => void, ms: number) => NodeJS.Timeout;
}

export {};
