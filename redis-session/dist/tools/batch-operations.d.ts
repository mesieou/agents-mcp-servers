import { RedisClient } from '../redis-client.js';
import { BatchOperation, MCPToolResult } from '../types.js';
export declare class BatchOperations {
    private redis;
    constructor(redis: RedisClient);
    private getInfoKey;
    private getCategoryKey;
    private getSessionKey;
    private getMessageKey;
    private getSessionMessagesKey;
    private getSessionMessagesIndexKey;
    executeBatchOperations(operations: BatchOperation[]): Promise<MCPToolResult<{
        successful: number;
        failed: number;
        results: any[];
    }>>;
    bulkCreateInfo(items: Array<{
        category: string;
        key: string;
        data: string;
        ttl?: number;
    }>): Promise<MCPToolResult<{
        created: number;
        failed: number;
    }>>;
    bulkCreateSessions(sessions: Array<{
        sessionId: string;
        metadata?: Record<string, any>;
        ttl?: number;
    }>): Promise<MCPToolResult<{
        created: number;
        failed: number;
    }>>;
    bulkCreateMessages(messages: Array<{
        sessionId: string;
        role: string;
        content: string;
        metadata?: Record<string, any>;
    }>): Promise<MCPToolResult<{
        created: number;
        failed: number;
    }>>;
    bulkDeleteInfo(category: string, keys: string[]): Promise<MCPToolResult<{
        deleted: number;
        failed: number;
    }>>;
    bulkDeleteSessions(sessionIds: string[]): Promise<MCPToolResult<{
        deleted: number;
        failed: number;
    }>>;
    bulkUpdateInfo(updates: Array<{
        category: string;
        key: string;
        data: string;
        ttl?: number;
    }>): Promise<MCPToolResult<{
        updated: number;
        failed: number;
    }>>;
    getBatchStats(): Promise<MCPToolResult<{
        infoCount: number;
        sessionCount: number;
        messageCount: number;
        totalKeys: number;
    }>>;
    cleanupExpiredData(): Promise<MCPToolResult<{
        cleaned: number;
        errors: number;
    }>>;
}
//# sourceMappingURL=batch-operations.d.ts.map