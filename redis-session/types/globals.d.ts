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
