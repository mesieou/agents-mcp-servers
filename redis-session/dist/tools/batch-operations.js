import { KEY_PATTERNS } from '../types.js';
export class BatchOperations {
    constructor(redis) {
        this.redis = redis;
    }
    getInfoKey(category, key) {
        return `${KEY_PATTERNS.info}:${category}:${key}`;
    }
    getCategoryKey(category) {
        return `${KEY_PATTERNS.category}:${category}`;
    }
    getSessionKey(sessionId) {
        return `${KEY_PATTERNS.session}:${sessionId}`;
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
    async executeBatchOperations(operations) {
        try {
            if (operations.length === 0) {
                return {
                    success: true,
                    data: {
                        successful: 0,
                        failed: 0,
                        results: []
                    }
                };
            }
            const pipeline = await this.redis.pipeline();
            const results = [];
            let successful = 0;
            let failed = 0;
            // Group operations by type for better organization
            const infoOps = operations.filter(op => op.type === 'info');
            const sessionOps = operations.filter(op => op.type === 'session');
            const messageOps = operations.filter(op => op.type === 'message');
            // Process info operations
            for (const op of infoOps) {
                try {
                    const [category, key] = op.key.split(':');
                    const infoKey = this.getInfoKey(category, key);
                    const categoryKey = this.getCategoryKey(category);
                    switch (op.operation) {
                        case 'create':
                            const infoItem = {
                                category,
                                key,
                                data: op.data.data,
                                ttl: op.ttl,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            };
                            pipeline.set(infoKey, JSON.stringify(infoItem), op.ttl);
                            pipeline.sadd(categoryKey, key);
                            results.push({ operation: op, result: 'created' });
                            successful++;
                            break;
                        case 'update':
                            const existingData = await this.redis.get(infoKey);
                            if (existingData) {
                                const existingInfo = JSON.parse(existingData);
                                const updatedInfo = {
                                    ...existingInfo,
                                    data: op.data.data,
                                    ttl: op.ttl,
                                    updatedAt: new Date().toISOString()
                                };
                                pipeline.set(infoKey, JSON.stringify(updatedInfo), op.ttl);
                                results.push({ operation: op, result: 'updated' });
                                successful++;
                            }
                            else {
                                results.push({ operation: op, result: 'not_found', error: 'Info item not found' });
                                failed++;
                            }
                            break;
                        case 'delete':
                            pipeline.del(infoKey);
                            pipeline.srem(categoryKey, key);
                            results.push({ operation: op, result: 'deleted' });
                            successful++;
                            break;
                    }
                }
                catch (error) {
                    results.push({ operation: op, result: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
                    failed++;
                }
            }
            // Process session operations
            for (const op of sessionOps) {
                try {
                    const sessionKey = this.getSessionKey(op.key);
                    switch (op.operation) {
                        case 'create':
                            const session = {
                                sessionId: op.key,
                                metadata: op.data.metadata || {},
                                ttl: op.ttl,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            };
                            pipeline.set(sessionKey, JSON.stringify(session), op.ttl);
                            pipeline.sadd('sessions:index', op.key);
                            results.push({ operation: op, result: 'created' });
                            successful++;
                            break;
                        case 'update':
                            const existingSessionData = await this.redis.get(sessionKey);
                            if (existingSessionData) {
                                const existingSession = JSON.parse(existingSessionData);
                                const updatedSession = {
                                    ...existingSession,
                                    metadata: {
                                        ...existingSession.metadata,
                                        ...op.data
                                    },
                                    updatedAt: new Date().toISOString()
                                };
                                const currentTtl = await this.redis.ttl(sessionKey);
                                pipeline.set(sessionKey, JSON.stringify(updatedSession), currentTtl > 0 ? currentTtl : undefined);
                                results.push({ operation: op, result: 'updated' });
                                successful++;
                            }
                            else {
                                results.push({ operation: op, result: 'not_found', error: 'Session not found' });
                                failed++;
                            }
                            break;
                        case 'delete':
                            pipeline.del(sessionKey);
                            pipeline.srem('sessions:index', op.key);
                            // Also delete all messages for this session
                            const sessionMessagesKey = this.getSessionMessagesKey(op.key);
                            const sessionMessagesIndexKey = this.getSessionMessagesIndexKey(op.key);
                            pipeline.del(sessionMessagesKey);
                            pipeline.del(sessionMessagesIndexKey);
                            results.push({ operation: op, result: 'deleted' });
                            successful++;
                            break;
                    }
                }
                catch (error) {
                    results.push({ operation: op, result: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
                    failed++;
                }
            }
            // Process message operations
            for (const op of messageOps) {
                try {
                    const [sessionId, messageId] = op.key.split(':');
                    const messageKey = this.getMessageKey(sessionId, messageId);
                    const sessionMessagesKey = this.getSessionMessagesKey(sessionId);
                    const sessionMessagesIndexKey = this.getSessionMessagesIndexKey(sessionId);
                    switch (op.operation) {
                        case 'create':
                            const message = {
                                messageId,
                                sessionId,
                                role: op.data.role,
                                content: op.data.content,
                                metadata: op.data.metadata || {},
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            };
                            pipeline.set(messageKey, JSON.stringify(message));
                            pipeline.lpush(sessionMessagesKey, messageId);
                            pipeline.sadd(sessionMessagesIndexKey, messageId);
                            results.push({ operation: op, result: 'created' });
                            successful++;
                            break;
                        case 'update':
                            const existingMessageData = await this.redis.get(messageKey);
                            if (existingMessageData) {
                                const existingMessage = JSON.parse(existingMessageData);
                                const updatedMessage = {
                                    ...existingMessage,
                                    content: op.data.content !== undefined ? op.data.content : existingMessage.content,
                                    role: op.data.role !== undefined ? op.data.role : existingMessage.role,
                                    metadata: {
                                        ...existingMessage.metadata,
                                        ...(op.data.metadata || {})
                                    },
                                    updatedAt: new Date().toISOString()
                                };
                                pipeline.set(messageKey, JSON.stringify(updatedMessage));
                                results.push({ operation: op, result: 'updated' });
                                successful++;
                            }
                            else {
                                results.push({ operation: op, result: 'not_found', error: 'Message not found' });
                                failed++;
                            }
                            break;
                        case 'delete':
                            pipeline.del(messageKey);
                            pipeline.lrem(sessionMessagesKey, 1, messageId);
                            pipeline.srem(sessionMessagesIndexKey, messageId);
                            results.push({ operation: op, result: 'deleted' });
                            successful++;
                            break;
                    }
                }
                catch (error) {
                    results.push({ operation: op, result: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
                    failed++;
                }
            }
            // Execute all operations in a single pipeline
            await pipeline.exec();
            return {
                success: true,
                data: {
                    successful,
                    failed,
                    results
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to execute batch operations: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async bulkCreateInfo(items) {
        try {
            const operations = items.map(item => ({
                operation: 'create',
                type: 'info',
                key: `${item.category}:${item.key}`,
                data: { data: item.data },
                ttl: item.ttl
            }));
            const result = await this.executeBatchOperations(operations);
            if (!result.success || !result.data) {
                return {
                    success: false,
                    error: result.error || 'Batch operation failed'
                };
            }
            return {
                success: true,
                data: {
                    created: result.data.successful,
                    failed: result.data.failed
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to bulk create info: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async bulkCreateSessions(sessions) {
        try {
            const operations = sessions.map(session => ({
                operation: 'create',
                type: 'session',
                key: session.sessionId,
                data: { metadata: session.metadata },
                ttl: session.ttl
            }));
            const result = await this.executeBatchOperations(operations);
            if (!result.success || !result.data) {
                return {
                    success: false,
                    error: result.error || 'Batch operation failed'
                };
            }
            return {
                success: true,
                data: {
                    created: result.data.successful,
                    failed: result.data.failed
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to bulk create sessions: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async bulkCreateMessages(messages) {
        try {
            const operations = messages.map((message, index) => ({
                operation: 'create',
                type: 'message',
                key: `${message.sessionId}:msg_${Date.now()}_${index}`,
                data: {
                    role: message.role,
                    content: message.content,
                    metadata: message.metadata
                }
            }));
            const result = await this.executeBatchOperations(operations);
            if (!result.success || !result.data) {
                return {
                    success: false,
                    error: result.error || 'Batch operation failed'
                };
            }
            return {
                success: true,
                data: {
                    created: result.data.successful,
                    failed: result.data.failed
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to bulk create messages: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async bulkDeleteInfo(category, keys) {
        try {
            const operations = keys.map(key => ({
                operation: 'delete',
                type: 'info',
                key: `${category}:${key}`
            }));
            const result = await this.executeBatchOperations(operations);
            if (!result.success || !result.data) {
                return {
                    success: false,
                    error: result.error || 'Batch operation failed'
                };
            }
            return {
                success: true,
                data: {
                    deleted: result.data.successful,
                    failed: result.data.failed
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to bulk delete info: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async bulkDeleteSessions(sessionIds) {
        try {
            const operations = sessionIds.map(sessionId => ({
                operation: 'delete',
                type: 'session',
                key: sessionId
            }));
            const result = await this.executeBatchOperations(operations);
            if (!result.success || !result.data) {
                return {
                    success: false,
                    error: result.error || 'Batch operation failed'
                };
            }
            return {
                success: true,
                data: {
                    deleted: result.data.successful,
                    failed: result.data.failed
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to bulk delete sessions: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async bulkUpdateInfo(updates) {
        try {
            const operations = updates.map(update => ({
                operation: 'update',
                type: 'info',
                key: `${update.category}:${update.key}`,
                data: { data: update.data },
                ttl: update.ttl
            }));
            const result = await this.executeBatchOperations(operations);
            if (!result.success || !result.data) {
                return {
                    success: false,
                    error: result.error || 'Batch operation failed'
                };
            }
            return {
                success: true,
                data: {
                    updated: result.data.successful,
                    failed: result.data.failed
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to bulk update info: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async getBatchStats() {
        try {
            // Get counts for different types
            const infoKeys = await this.redis.keys(`${KEY_PATTERNS.info}:*`);
            const sessionKeys = await this.redis.keys(`${KEY_PATTERNS.session}:*`);
            const messageKeys = await this.redis.keys(`${KEY_PATTERNS.session}:*:${KEY_PATTERNS.message}:*`);
            // Filter out message index keys
            const actualMessageKeys = messageKeys.filter(key => !key.includes(`${KEY_PATTERNS.message}s`) && key.includes(`${KEY_PATTERNS.message}:`));
            return {
                success: true,
                data: {
                    infoCount: infoKeys.length,
                    sessionCount: sessionKeys.filter(key => !key.includes(':')).length,
                    messageCount: actualMessageKeys.length,
                    totalKeys: infoKeys.length + sessionKeys.length + actualMessageKeys.length
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to get batch stats: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async cleanupExpiredData() {
        try {
            let cleaned = 0;
            let errors = 0;
            // Clean up expired info items
            const infoKeys = await this.redis.keys(`${KEY_PATTERNS.info}:*`);
            for (const key of infoKeys) {
                try {
                    const ttl = await this.redis.ttl(key);
                    if (ttl === -2) { // Key has expired
                        await this.redis.del(key);
                        cleaned++;
                    }
                }
                catch (error) {
                    errors++;
                }
            }
            // Clean up expired sessions
            const sessionKeys = await this.redis.keys(`${KEY_PATTERNS.session}:*`);
            for (const key of sessionKeys) {
                try {
                    if (!key.includes(':') && !key.includes('index')) { // Only actual session keys
                        const ttl = await this.redis.ttl(key);
                        if (ttl === -2) { // Key has expired
                            await this.redis.del(key);
                            await this.redis.srem('sessions:index', key.split(':')[1]);
                            cleaned++;
                        }
                    }
                }
                catch (error) {
                    errors++;
                }
            }
            return {
                success: true,
                data: {
                    cleaned,
                    errors
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to cleanup expired data: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}
//# sourceMappingURL=batch-operations.js.map