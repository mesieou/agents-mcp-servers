import { RedisClient } from '../redis-client.js';
import { Message, MCPToolResult, PaginatedResult } from '../types.js';
export declare class MessageCRUD {
    private redis;
    constructor(redis: RedisClient);
    private getMessageKey;
    private getSessionMessagesKey;
    private getSessionMessagesIndexKey;
    private generateMessageId;
    createMessage(sessionId: string, role: string, content: string, metadata?: Record<string, any>): Promise<MCPToolResult<Message>>;
    getMessage(sessionId: string, messageId: string): Promise<MCPToolResult<Message>>;
    getMessages(sessionId: string, limit?: number, offset?: number): Promise<MCPToolResult<PaginatedResult<Message>>>;
    searchMessages(sessionId: string, query: string, limit?: number): Promise<MCPToolResult<Message[]>>;
    updateMessage(sessionId: string, messageId: string, updates: Record<string, any>): Promise<MCPToolResult<Message>>;
    deleteMessage(sessionId: string, messageId: string): Promise<MCPToolResult<boolean>>;
    deleteAllMessages(sessionId: string): Promise<MCPToolResult<number>>;
    getMessageCount(sessionId: string): Promise<MCPToolResult<number>>;
    getRecentMessages(sessionId: string, hours?: number): Promise<MCPToolResult<Message[]>>;
}
//# sourceMappingURL=message-crud.d.ts.map