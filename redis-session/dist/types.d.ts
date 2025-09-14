export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    db?: number;
    maxConnections?: number;
}
export interface CacheConfig {
    ttl: number;
    batchSize: number;
}
export interface InfoItem {
    category: string;
    key: string;
    data: string;
    ttl?: number;
    createdAt: string;
    updatedAt: string;
}
export interface Session {
    sessionId: string;
    metadata?: Record<string, any>;
    ttl?: number;
    createdAt: string;
    updatedAt: string;
}
export interface Message {
    messageId: string;
    sessionId: string;
    role: string;
    content: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}
export interface BatchOperation {
    operation: 'create' | 'update' | 'delete';
    type: 'info' | 'session' | 'message';
    key: string;
    data?: any;
    ttl?: number;
}
export interface SearchOptions {
    limit?: number;
    offset?: number;
    pattern?: string;
}
export interface MessageSearchOptions extends SearchOptions {
    query?: string;
}
export interface KeyPatterns {
    info: string;
    session: string;
    message: string;
    category: string;
}
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}
export interface MCPToolResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    count?: number;
}
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
export declare const KEY_PATTERNS: KeyPatterns;
export declare const CACHE_KEYS: {
    readonly RECENT_MESSAGES: "cache:recent:messages";
    readonly ACTIVE_SESSIONS: "cache:active:sessions";
    readonly BUSINESS_INFO: "cache:business:info";
};
export type CacheKey = typeof CACHE_KEYS[keyof typeof CACHE_KEYS];
//# sourceMappingURL=types.d.ts.map