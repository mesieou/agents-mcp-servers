import { createClient } from 'redis';
export class RedisClient {
    constructor(config, cacheConfig) {
        this.cache = new Map();
        this.connected = false;
        this.config = config;
        this.cacheConfig = cacheConfig;
        const redisOptions = {
            socket: {
                host: config.host,
                port: config.port,
                reconnectStrategy: (retries) => Math.min(retries * 50, 500)
            },
            database: config.db || 0,
            ...(config.password && config.password.trim() !== '' && { password: config.password })
        };
        this.client = createClient(redisOptions);
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.client.on('connect', () => {
            console.log('Redis client connected');
            this.connected = true;
        });
        this.client.on('ready', () => {
            console.log('Redis client ready');
        });
        this.client.on('error', (err) => {
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
    async connect() {
        if (!this.connected) {
            await this.client.connect();
        }
    }
    async disconnect() {
        if (this.connected) {
            await this.client.quit();
            this.connected = false;
        }
    }
    isConnected() {
        return this.connected;
    }
    // Basic Redis operations
    async get(key) {
        await this.ensureConnected();
        return await this.client.get(key);
    }
    async set(key, value, ttl) {
        await this.ensureConnected();
        if (ttl) {
            await this.client.setEx(key, ttl, value);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async del(key) {
        await this.ensureConnected();
        return await this.client.del(key);
    }
    async exists(key) {
        await this.ensureConnected();
        const result = await this.client.exists(key);
        return result === 1;
    }
    async expire(key, seconds) {
        await this.ensureConnected();
        const result = await this.client.expire(key, seconds);
        return result;
    }
    async ttl(key) {
        await this.ensureConnected();
        return await this.client.ttl(key);
    }
    // Hash operations
    async hget(key, field) {
        await this.ensureConnected();
        return await this.client.hGet(key, field) || undefined;
    }
    async hset(key, field, value) {
        await this.ensureConnected();
        return await this.client.hSet(key, field, value);
    }
    async hgetall(key) {
        await this.ensureConnected();
        return await this.client.hGetAll(key);
    }
    async hdel(key, field) {
        await this.ensureConnected();
        return await this.client.hDel(key, field);
    }
    // List operations
    async lpush(key, ...values) {
        await this.ensureConnected();
        return await this.client.lPush(key, values);
    }
    async rpush(key, ...values) {
        await this.ensureConnected();
        return await this.client.rPush(key, values);
    }
    async lrange(key, start, stop) {
        await this.ensureConnected();
        return await this.client.lRange(key, start, stop);
    }
    async llen(key) {
        await this.ensureConnected();
        return await this.client.lLen(key);
    }
    async lrem(key, count, value) {
        await this.ensureConnected();
        return await this.client.lRem(key, count, value);
    }
    // Set operations
    async sadd(key, ...members) {
        await this.ensureConnected();
        return await this.client.sAdd(key, members);
    }
    async smembers(key) {
        await this.ensureConnected();
        return await this.client.sMembers(key);
    }
    async srem(key, ...members) {
        await this.ensureConnected();
        return await this.client.sRem(key, members);
    }
    // Pattern matching
    async keys(pattern) {
        await this.ensureConnected();
        return await this.client.keys(pattern);
    }
    // Pipeline operations for batch efficiency
    async pipeline() {
        await this.ensureConnected();
        return this.client.multi();
    }
    // Smart caching with TTL
    setCache(key, data, ttl) {
        const cacheTTL = ttl || this.cacheConfig.ttl;
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: cacheTTL
        });
    }
    getCache(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl * 1000) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    clearCache(pattern) {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        }
        else {
            this.cache.clear();
        }
    }
    // Cleanup expired cache entries
    cleanupCache() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl * 1000) {
                this.cache.delete(key);
            }
        }
    }
    async ensureConnected() {
        if (!this.connected) {
            await this.connect();
        }
    }
    // Get Redis client instance for advanced operations
    getClient() {
        return this.client;
    }
}
//# sourceMappingURL=redis-client.js.map