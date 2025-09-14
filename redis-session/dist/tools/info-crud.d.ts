import { RedisClient } from '../redis-client.js';
import { InfoItem, MCPToolResult } from '../types.js';
export declare class InfoCRUD {
    private redis;
    constructor(redis: RedisClient);
    private getInfoKey;
    private getCategoryKey;
    createInfo(category: string, key: string, data: string, ttl?: number): Promise<MCPToolResult<InfoItem>>;
    getInfo(category: string, key: string): Promise<MCPToolResult<InfoItem>>;
    listInfo(category?: string, pattern?: string): Promise<MCPToolResult<InfoItem[]>>;
    updateInfo(category: string, key: string, data: string, ttl?: number): Promise<MCPToolResult<InfoItem>>;
    deleteInfo(category: string, key: string): Promise<MCPToolResult<boolean>>;
    deleteCategory(category: string): Promise<MCPToolResult<number>>;
    getCategoryInfo(category: string): Promise<MCPToolResult<{
        category: string;
        count: number;
        keys: string[];
    }>>;
    searchInfo(query: string, category?: string): Promise<MCPToolResult<InfoItem[]>>;
}
//# sourceMappingURL=info-crud.d.ts.map