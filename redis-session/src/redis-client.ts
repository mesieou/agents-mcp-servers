import { createClient, RedisClientType, RedisClientOptions } from 'redis';
import { RedisConfig, CacheConfig, CacheEntry } from './types.js';

export class RedisClient {
  private client: any;
  private config: RedisConfig;
  private cacheConfig: CacheConfig;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private connected: boolean = false;

  constructor(config: RedisConfig, cacheConfig: CacheConfig) {
    this.config = config;
    this.cacheConfig = cacheConfig;

    const redisOptions: RedisClientOptions = {
      socket: {
        host: config.host,
        port: config.port,
        reconnectStrategy: (retries: number) => Math.min(retries * 50, 500)
      },
      database: config.db || 0,
      ...(config.password && config.password.trim() !== '' && { password: config.password })
    };

    this.client = createClient(redisOptions);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('Redis client connected');
      this.connected = true;
    });

    this.client.on('ready', () => {
      console.log('Redis client ready');
    });

    this.client.on('error', (err: any) => {
      console.error('Redis client error:', err);
      this.connected = false;
    });

    this.client.on('end', () => {
      console.log('Redis client disconnected');
      this.connected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('Redis client reconnecting...');
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Basic Redis operations
  async get(key: string): Promise<string | null> {
    await this.ensureConnected();
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    await this.ensureConnected();
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<number> {
    await this.ensureConnected();
    return await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    await this.ensureConnected();
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    await this.ensureConnected();
    const result = await this.client.expire(key, seconds);
    return result;
  }

  async ttl(key: string): Promise<number> {
    await this.ensureConnected();
    return await this.client.ttl(key);
  }

  // Hash operations
  async hget(key: string, field: string): Promise<string | undefined> {
    await this.ensureConnected();
    return await this.client.hGet(key, field) || undefined;
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    await this.ensureConnected();
    return await this.client.hSet(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    await this.ensureConnected();
    return await this.client.hGetAll(key);
  }

  async hdel(key: string, field: string): Promise<number> {
    await this.ensureConnected();
    return await this.client.hDel(key, field);
  }

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    await this.ensureConnected();
    return await this.client.lPush(key, values);
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    await this.ensureConnected();
    return await this.client.rPush(key, values);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    await this.ensureConnected();
    return await this.client.lRange(key, start, stop);
  }

  async llen(key: string): Promise<number> {
    await this.ensureConnected();
    return await this.client.lLen(key);
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    await this.ensureConnected();
    return await this.client.lRem(key, count, value);
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    await this.ensureConnected();
    return await this.client.sAdd(key, members);
  }

  async smembers(key: string): Promise<string[]> {
    await this.ensureConnected();
    return await this.client.sMembers(key);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    await this.ensureConnected();
    return await this.client.sRem(key, members);
  }

  // Pattern matching
  async keys(pattern: string): Promise<string[]> {
    await this.ensureConnected();
    return await this.client.keys(pattern);
  }

  // Pipeline operations for batch efficiency
  async pipeline(): Promise<any> {
    await this.ensureConnected();
    return this.client.multi();
  }

  // Smart caching with TTL
  setCache<T>(key: string, data: T, ttl?: number): void {
    const cacheTTL = ttl || this.cacheConfig.ttl;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: cacheTTL
    });
  }

  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Cleanup expired cache entries
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.cache.delete(key);
      }
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  // Get Redis client instance for advanced operations
  getClient(): any {
    return this.client;
  }
}
