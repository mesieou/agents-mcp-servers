import { KEY_PATTERNS, CACHE_KEYS } from '../types.js';
export class MessageCRUD {
    constructor(redis) {
        this.redis = redis;
    }
    getMessageKey(sessionId, messageId) {
        return `${KEY_PATTERNS.session}:${sessionId}:${KEY_PATTERNS.message}:${messageId}`;
    }
    getSessionMessagesKey(sessionId) {
        return `${KEY_PATTERNS.session}:${sessionId}:${KEY_PATTERNS.message}s`;
    }
    getSessionMessagesIndexKey(sessionId) {
        return `${KEY_PATTERNS.session}:${sessionId}:${KEY_PATTERNS.message}s:index`;
    }
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async createMessage(sessionId, role, content, metadata) {
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
            const message = {
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
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to create message: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async getMessage(sessionId, messageId) {
        try {
            const cacheKey = `${CACHE_KEYS.RECENT_MESSAGES}:${sessionId}:${messageId}`;
            // Check cache first
            const cached = this.redis.getCache(cacheKey);
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
            const message = JSON.parse(data);
            // Cache the result
            this.redis.setCache(cacheKey, message);
            return {
                success: true,
                data: message
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to get message: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async getMessages(sessionId, limit, offset) {
        try {
            const cacheKey = `${CACHE_KEYS.RECENT_MESSAGES}:${sessionId}:${limit || 50}:${offset || 0}`;
            // Check cache first
            const cached = this.redis.getCache(cacheKey);
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
                const emptyResult = {
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
                const emptyResult = {
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
            const messages = [];
            results.forEach((result, index) => {
                if (result && typeof result === 'string') {
                    try {
                        const message = JSON.parse(result);
                        messages.push(message);
                    }
                    catch (parseError) {
                        console.warn(`Failed to parse message ${messageIds[index]}:`, parseError);
                    }
                }
            });
            const paginatedResult = {
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
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to get messages: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async searchMessages(sessionId, query, limit) {
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
            const allMessages = [];
            results.forEach((result, index) => {
                if (result && typeof result === 'string') {
                    try {
                        const message = JSON.parse(result);
                        allMessages.push(message);
                    }
                    catch (parseError) {
                        console.warn(`Failed to parse message ${messageIds[index]}:`, parseError);
                    }
                }
            });
            // Filter messages that contain the query string
            const matchingMessages = allMessages.filter(message => message.content.toLowerCase().includes(query.toLowerCase()) ||
                message.role.toLowerCase().includes(query.toLowerCase()) ||
                JSON.stringify(message.metadata || {}).toLowerCase().includes(query.toLowerCase()));
            // Apply limit
            const limitedMessages = limit ? matchingMessages.slice(0, limit) : matchingMessages;
            return {
                success: true,
                data: limitedMessages,
                count: limitedMessages.length
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to search messages: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async updateMessage(sessionId, messageId, updates) {
        try {
            const messageKey = this.getMessageKey(sessionId, messageId);
            const existingData = await this.redis.get(messageKey);
            if (!existingData) {
                return {
                    success: false,
                    error: `Message '${messageId}' not found in session '${sessionId}'`
                };
            }
            const existingMessage = JSON.parse(existingData);
            // Update message fields
            const updatedMessage = {
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
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to update message: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async deleteMessage(sessionId, messageId) {
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
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async deleteAllMessages(sessionId) {
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
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to delete all messages: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async getMessageCount(sessionId) {
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
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to get message count: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async getRecentMessages(sessionId, hours = 24) {
        try {
            const cacheKey = `${CACHE_KEYS.RECENT_MESSAGES}:${sessionId}:recent:${hours}h`;
            // Check cache first
            const cached = this.redis.getCache(cacheKey);
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
            const allMessages = [];
            results.forEach((result, index) => {
                if (result && typeof result === 'string') {
                    try {
                        const message = JSON.parse(result);
                        allMessages.push(message);
                    }
                    catch (parseError) {
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
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to get recent messages: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}
//# sourceMappingURL=message-crud.js.map