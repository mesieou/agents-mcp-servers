import { RedisClient } from '../redis-client.js';
import { Message, MCPToolResult, MessageSearchOptions, PaginatedResult, KEY_PATTERNS, CACHE_KEYS } from '../types.js';

export class MessageCRUD {
  private redis: RedisClient;

  constructor(redis: RedisClient) {
    this.redis = redis;
  }

  private getMessageKey(sessionId: string, messageId: string): string {
    return `${KEY_PATTERNS.session}:${sessionId}:${KEY_PATTERNS.message}:${messageId}`;
  }

  private getSessionMessagesKey(sessionId: string): string {
    return `${KEY_PATTERNS.session}:${sessionId}:${KEY_PATTERNS.message}s`;
  }

  private getSessionMessagesIndexKey(sessionId: string): string {
    return `${KEY_PATTERNS.session}:${sessionId}:${KEY_PATTERNS.message}s:index`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async createMessage(sessionId: string, role: string, content: string, metadata?: Record<string, any>): Promise<MCPToolResult<Message>> {
    try {
      // Verify session exists
      const sessionKey = `${KEY_PATTERNS.session}:${sessionId}`;
      const sessionExists = await this.redis.exists(sessionKey);
      if (!sessionExists) {
        return {
          success: false,
          error: `Session '${sessionId}' not found`
        };
      }

      const messageId = this.generateMessageId();
      const messageKey = this.getMessageKey(sessionId, messageId);
      const sessionMessagesKey = this.getSessionMessagesKey(sessionId);
      const sessionMessagesIndexKey = this.getSessionMessagesIndexKey(sessionId);

      const now = new Date().toISOString();
      const message: Message = {
        messageId,
        sessionId,
        role,
        content,
        metadata: metadata || {},
        createdAt: now,
        updatedAt: now
      };

      // Store the message
      await this.redis.set(messageKey, JSON.stringify(message));

      // Add to session messages list (for pagination)
      await this.redis.lpush(sessionMessagesKey, messageId);

      // Add to session messages index (for efficient searching)
      await this.redis.sadd(sessionMessagesIndexKey, messageId);

      // Clear cache for this session
      this.redis.clearCache(`${CACHE_KEYS.RECENT_MESSAGES}:${sessionId}`);

      return {
        success: true,
        data: message
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create message: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getMessage(sessionId: string, messageId: string): Promise<MCPToolResult<Message>> {
    try {
      const cacheKey = `${CACHE_KEYS.RECENT_MESSAGES}:${sessionId}:${messageId}`;

      // Check cache first
      const cached = this.redis.getCache<Message>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached
        };
      }

      const messageKey = this.getMessageKey(sessionId, messageId);
      const data = await this.redis.get(messageKey);

      if (!data) {
        return {
          success: false,
          error: `Message '${messageId}' not found in session '${sessionId}'`
        };
      }

      const message: Message = JSON.parse(data);

      // Cache the result
      this.redis.setCache(cacheKey, message);

      return {
        success: true,
        data: message
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get message: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getMessages(sessionId: string, limit?: number, offset?: number): Promise<MCPToolResult<PaginatedResult<Message>>> {
    try {
      const cacheKey = `${CACHE_KEYS.RECENT_MESSAGES}:${sessionId}:${limit || 50}:${offset || 0}`;

      // Check cache first
      const cached = this.redis.getCache<PaginatedResult<Message>>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached
        };
      }

      // Verify session exists
      const sessionKey = `${KEY_PATTERNS.session}:${sessionId}`;
      const sessionExists = await this.redis.exists(sessionKey);
      if (!sessionExists) {
        return {
          success: false,
          error: `Session '${sessionId}' not found`
        };
      }

      const sessionMessagesKey = this.getSessionMessagesKey(sessionId);
      const totalCount = await this.redis.llen(sessionMessagesKey);

      if (totalCount === 0) {
        const emptyResult: PaginatedResult<Message> = {
          items: [],
          total: 0,
          limit: limit || 50,
          offset: offset || 0,
          hasMore: false
        };
        return {
          success: true,
          data: emptyResult
        };
      }

      // Calculate pagination
      const start = offset || 0;
      const end = start + (limit || 50) - 1;
      const hasMore = end < totalCount - 1;

      // Get message IDs from the list
      const messageIds = await this.redis.lrange(sessionMessagesKey, start, end);

      if (messageIds.length === 0) {
        const emptyResult: PaginatedResult<Message> = {
          items: [],
          total: totalCount,
          limit: limit || 50,
          offset: offset || 0,
          hasMore
        };
        return {
          success: true,
          data: emptyResult
        };
      }

      // Batch get all messages
      const pipeline = await this.redis.pipeline();
      messageIds.forEach(messageId => {
        const messageKey = this.getMessageKey(sessionId, messageId);
        pipeline.get(messageKey);
      });
      const results = await pipeline.exec();

      const messages: Message[] = [];
      results.forEach((result, index) => {
        if (result && typeof result === 'string') {
          try {
            const message: Message = JSON.parse(result);
            messages.push(message);
          } catch (parseError) {
            console.warn(`Failed to parse message ${messageIds[index]}:`, parseError);
          }
        }
      });

      const paginatedResult: PaginatedResult<Message> = {
        items: messages,
        total: totalCount,
        limit: limit || 50,
        offset: offset || 0,
        hasMore
      };

      // Cache the result
      this.redis.setCache(cacheKey, paginatedResult);

      return {
        success: true,
        data: paginatedResult
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async searchMessages(sessionId: string, query: string, limit?: number): Promise<MCPToolResult<Message[]>> {
    try {
      // Verify session exists
      const sessionKey = `${KEY_PATTERNS.session}:${sessionId}`;
      const sessionExists = await this.redis.exists(sessionKey);
      if (!sessionExists) {
        return {
          success: false,
          error: `Session '${sessionId}' not found`
        };
      }

      const sessionMessagesIndexKey = this.getSessionMessagesIndexKey(sessionId);
      const messageIds = await this.redis.smembers(sessionMessagesIndexKey);

      if (messageIds.length === 0) {
        return {
          success: true,
          data: [],
          count: 0
        };
      }

      // Batch get all messages for searching
      const pipeline = await this.redis.pipeline();
      messageIds.forEach(messageId => {
        const messageKey = this.getMessageKey(sessionId, messageId);
        pipeline.get(messageKey);
      });
      const results = await pipeline.exec();

      const allMessages: Message[] = [];
      results.forEach((result, index) => {
        if (result && typeof result === 'string') {
          try {
            const message: Message = JSON.parse(result);
            allMessages.push(message);
          } catch (parseError) {
            console.warn(`Failed to parse message ${messageIds[index]}:`, parseError);
          }
        }
      });

      // Filter messages that contain the query string
      const matchingMessages = allMessages.filter(message =>
        message.content.toLowerCase().includes(query.toLowerCase()) ||
        message.role.toLowerCase().includes(query.toLowerCase()) ||
        JSON.stringify(message.metadata || {}).toLowerCase().includes(query.toLowerCase())
      );

      // Apply limit
      const limitedMessages = limit ? matchingMessages.slice(0, limit) : matchingMessages;

      return {
        success: true,
        data: limitedMessages,
        count: limitedMessages.length
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async updateMessage(sessionId: string, messageId: string, updates: Record<string, any>): Promise<MCPToolResult<Message>> {
    try {
      const messageKey = this.getMessageKey(sessionId, messageId);
      const existingData = await this.redis.get(messageKey);

      if (!existingData) {
        return {
          success: false,
          error: `Message '${messageId}' not found in session '${sessionId}'`
        };
      }

      const existingMessage: Message = JSON.parse(existingData);

      // Update message fields
      const updatedMessage: Message = {
        ...existingMessage,
        content: updates.content !== undefined ? updates.content : existingMessage.content,
        role: updates.role !== undefined ? updates.role : existingMessage.role,
        metadata: {
          ...existingMessage.metadata,
          ...(updates.metadata || {})
        },
        updatedAt: new Date().toISOString()
      };

      // Store updated message
      await this.redis.set(messageKey, JSON.stringify(updatedMessage));

      // Clear cache
      this.redis.clearCache(`${CACHE_KEYS.RECENT_MESSAGES}:${sessionId}:${messageId}`);
      this.redis.clearCache(`${CACHE_KEYS.RECENT_MESSAGES}:${sessionId}`);

      return {
        success: true,
        data: updatedMessage
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update message: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async deleteMessage(sessionId: string, messageId: string): Promise<MCPToolResult<boolean>> {
    try {
      const messageKey = this.getMessageKey(sessionId, messageId);
      const sessionMessagesKey = this.getSessionMessagesKey(sessionId);
      const sessionMessagesIndexKey = this.getSessionMessagesIndexKey(sessionId);

      // Check if message exists
      const exists = await this.redis.exists(messageKey);
      if (!exists) {
        return {
          success: false,
          error: `Message '${messageId}' not found in session '${sessionId}'`
        };
      }

      // Delete the message
      await this.redis.del(messageKey);

      // Remove from session messages list
      await this.redis.lrem(sessionMessagesKey, 1, messageId);

      // Remove from session messages index
      await this.redis.srem(sessionMessagesIndexKey, messageId);

      // Clear cache
      this.redis.clearCache(`${CACHE_KEYS.RECENT_MESSAGES}:${sessionId}:${messageId}`);
      this.redis.clearCache(`${CACHE_KEYS.RECENT_MESSAGES}:${sessionId}`);

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async deleteAllMessages(sessionId: string): Promise<MCPToolResult<number>> {
    try {
      // Verify session exists
      const sessionKey = `${KEY_PATTERNS.session}:${sessionId}`;
      const sessionExists = await this.redis.exists(sessionKey);
      if (!sessionExists) {
        return {
          success: false,
          error: `Session '${sessionId}' not found`
        };
      }

      const sessionMessagesKey = this.getSessionMessagesKey(sessionId);
      const sessionMessagesIndexKey = this.getSessionMessagesIndexKey(sessionId);

      // Get all message IDs
      const messageIds = await this.redis.smembers(sessionMessagesIndexKey);

      if (messageIds.length === 0) {
        return {
          success: true,
          data: 0,
          count: 0
        };
      }

      // Delete all messages
      const pipeline = await this.redis.pipeline();
      messageIds.forEach(messageId => {
        const messageKey = this.getMessageKey(sessionId, messageId);
        pipeline.del(messageKey);
      });

      // Clear the messages list and index
      pipeline.del(sessionMessagesKey);
      pipeline.del(sessionMessagesIndexKey);

      await pipeline.exec();

      // Clear cache for this session
      this.redis.clearCache(`${CACHE_KEYS.RECENT_MESSAGES}:${sessionId}`);

      return {
        success: true,
        data: messageIds.length,
        count: messageIds.length
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete all messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getMessageCount(sessionId: string): Promise<MCPToolResult<number>> {
    try {
      // Verify session exists
      const sessionKey = `${KEY_PATTERNS.session}:${sessionId}`;
      const sessionExists = await this.redis.exists(sessionKey);
      if (!sessionExists) {
        return {
          success: false,
          error: `Session '${sessionId}' not found`
        };
      }

      const sessionMessagesKey = this.getSessionMessagesKey(sessionId);
      const count = await this.redis.llen(sessionMessagesKey);

      return {
        success: true,
        data: count,
        count
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get message count: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getRecentMessages(sessionId: string, hours: number = 24): Promise<MCPToolResult<Message[]>> {
    try {
      const cacheKey = `${CACHE_KEYS.RECENT_MESSAGES}:${sessionId}:recent:${hours}h`;

      // Check cache first
      const cached = this.redis.getCache<Message[]>(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          count: cached.length
        };
      }

      // Verify session exists
      const sessionKey = `${KEY_PATTERNS.session}:${sessionId}`;
      const sessionExists = await this.redis.exists(sessionKey);
      if (!sessionExists) {
        return {
          success: false,
          error: `Session '${sessionId}' not found`
        };
      }

      const sessionMessagesIndexKey = this.getSessionMessagesIndexKey(sessionId);
      const messageIds = await this.redis.smembers(sessionMessagesIndexKey);

      if (messageIds.length === 0) {
        return {
          success: true,
          data: [],
          count: 0
        };
      }

      // Batch get all messages
      const pipeline = await this.redis.pipeline();
      messageIds.forEach(messageId => {
        const messageKey = this.getMessageKey(sessionId, messageId);
        pipeline.get(messageKey);
      });
      const results = await pipeline.exec();

      const allMessages: Message[] = [];
      results.forEach((result, index) => {
        if (result && typeof result === 'string') {
          try {
            const message: Message = JSON.parse(result);
            allMessages.push(message);
          } catch (parseError) {
            console.warn(`Failed to parse message ${messageIds[index]}:`, parseError);
          }
        }
      });

      // Filter messages from the last N hours
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const recentMessages = allMessages
        .filter(message => message.createdAt > cutoffTime)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Cache the result for 5 minutes
      this.redis.setCache(cacheKey, recentMessages, 300);

      return {
        success: true,
        data: recentMessages,
        count: recentMessages.length
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get recent messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
