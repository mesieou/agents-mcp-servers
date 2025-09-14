import { RedisClient } from '../redis-client.js';
import { Session, MCPToolResult } from '../types.js';
export declare class SessionCRUD {
    private redis;
    constructor(redis: RedisClient);
    private getSessionKey;
    private getSessionIndexKey;
    createSession(sessionId: string, metadata?: Record<string, any>, ttl?: number): Promise<MCPToolResult<Session>>;
    getSession(sessionId: string): Promise<MCPToolResult<Session>>;
    listSessions(pattern?: string, limit?: number): Promise<MCPToolResult<Session[]>>;
    updateSession(sessionId: string, updates: Record<string, any>): Promise<MCPToolResult<Session>>;
    deleteSession(sessionId: string): Promise<MCPToolResult<boolean>>;
    getActiveSessions(): Promise<MCPToolResult<Session[]>>;
    searchSessions(query: string, limit?: number): Promise<MCPToolResult<Session[]>>;
    getSessionStats(): Promise<MCPToolResult<{
        total: number;
        active: number;
        expired: number;
    }>>;
    cleanupExpiredSessions(): Promise<MCPToolResult<number>>;
}
//# sourceMappingURL=session-crud.d.ts.map