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
    lPush(key: string, ...values: string[]): Promise<number>;
    rPush(key: string, ...values: string[]): Promise<number>;
    lRange(key: string, start: number, stop: number): Promise<string[]>;
    lLen(key: string): Promise<number>;
    lRem(key: string, count: number, value: string): Promise<number>;
    sAdd(key: string, ...members: string[]): Promise<number>;
    sMembers(key: string): Promise<string[]>;
    sRem(key: string, ...members: string[]): Promise<number>;
    keys(pattern: string): Promise<string[]>;
    multi(): any;
  }

  export function createClient(options?: RedisClientOptions): RedisClientType;
}
