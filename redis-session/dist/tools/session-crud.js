import { KEY_PATTERNS, CACHE_KEYS } from '../types.js';
export class SessionCRUD {
    constructor(redis) {
        this.redis = redis;
    }
    getSessionKey(sessionId) {
        return `${KEY_PATTERNS.session}:${sessionId}`;
    }
    getSessionIndexKey() {
        return 'sessions:index';
    }
    async createSession(sessionId, metadata, ttl) {
        try {
            const sessionKey = this.getSessionKey(sessionId);
            const indexKey = this.getSessionIndexKey();
            // Check if session already exists
            const exists = await this.redis.exists(sessionKey);
            if (exists) {
                return {
                    success: false,
                    error: `Session '${sessionId}' already exists`
                };
            }
            const now = new Date().toISOString();
            const session = {
                sessionId,
                metadata: metadata || {},
                ttl,
                createdAt: now,
                updatedAt: now
            };
            // Store the session
            await this.redis.set(sessionKey, JSON.stringify(session), ttl);
            // Add to session index for efficient listing
            await this.redis.sadd(indexKey, sessionId);
            // Clear cache
            this.redis.clearCache(CACHE_KEYS.ACTIVE_SESSIONS);
            return {
                success: true,
                data: session
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async getSession(sessionId) {
        try {
            const cacheKey = `${CACHE_KEYS.ACTIVE_SESSIONS}:${sessionId}`;
            // Check cache first
            const cached = this.redis.getCache(cacheKey);
            if (cached) {
                return {
                    success: true,
                    data: cached
                };
            }
            const sessionKey = this.getSessionKey(sessionId);
            const data = await this.redis.get(sessionKey);
            if (!data) {
                return {
                    success: false,
                    error: `Session '${sessionId}' not found`
                };
            }
            const session = JSON.parse(data);
            // Cache the result
            this.redis.setCache(cacheKey, session);
            return {
                success: true,
                data: session
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to get session: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async listSessions(pattern, limit) {
        try {
            let sessionIds = [];
            if (pattern) {
                // Use pattern matching for filtered results
                const searchPattern = `${KEY_PATTERNS.session}:*${pattern}*`;
                const keys = await this.redis.keys(searchPattern);
                sessionIds = keys.map(key => key.split(':')[1]); // Extract sessionId from key
            }
            else {
                // Get all sessions from index
                sessionIds = await this.redis.smembers(this.getSessionIndexKey());
            }
            // Apply limit
            if (limit && limit > 0) {
                sessionIds = sessionIds.slice(0, limit);
            }
            if (sessionIds.length === 0) {
                return {
                    success: true,
                    data: [],
                    count: 0
                };
            }
            // Batch get all sessions
            const pipeline = await this.redis.pipeline();
            sessionIds.forEach(sessionId => {
                const sessionKey = this.getSessionKey(sessionId);
                pipeline.get(sessionKey);
            });
            const results = await pipeline.exec();
            const sessions = [];
            results.forEach((result, index) => {
                if (result && typeof result === 'string') {
                    try {
                        const session = JSON.parse(result);
                        sessions.push(session);
                    }
                    catch (parseError) {
                        console.warn(`Failed to parse session ${sessionIds[index]}:`, parseError);
                    }
                }
            });
            return {
                success: true,
                data: sessions,
                count: sessions.length
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to list sessions: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async updateSession(sessionId, updates) {
        try {
            const sessionKey = this.getSessionKey(sessionId);
            const existingData = await this.redis.get(sessionKey);
            if (!existingData) {
                return {
                    success: false,
                    error: `Session '${sessionId}' not found`
                };
            }
            const existingSession = JSON.parse(existingData);
            // Merge updates with existing session
            const updatedSession = {
                ...existingSession,
                metadata: {
                    ...existingSession.metadata,
                    ...updates
                },
                updatedAt: new Date().toISOString()
            };
            // Get current TTL to preserve it
            const currentTtl = await this.redis.ttl(sessionKey);
            // Update the session
            if (currentTtl > 0) {
                await this.redis.set(sessionKey, JSON.stringify(updatedSession), currentTtl);
            }
            else {
                await this.redis.set(sessionKey, JSON.stringify(updatedSession));
            }
            // Clear cache
            this.redis.clearCache(`${CACHE_KEYS.ACTIVE_SESSIONS}:${sessionId}`);
            return {
                success: true,
                data: updatedSession
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to update session: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async deleteSession(sessionId) {
        try {
            const sessionKey = this.getSessionKey(sessionId);
            const indexKey = this.getSessionIndexKey();
            // Check if session exists
            const exists = await this.redis.exists(sessionKey);
            if (!exists) {
                return {
                    success: false,
                    error: `Session '${sessionId}' not found`
                };
            }
            // Delete the session
            await this.redis.del(sessionKey);
            // Remove from session index
            await this.redis.srem(indexKey, sessionId);
            // Clear cache
            this.redis.clearCache(`${CACHE_KEYS.ACTIVE_SESSIONS}:${sessionId}`);
            return {
                success: true,
                data: true
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async getActiveSessions() {
        try {
            const cacheKey = CACHE_KEYS.ACTIVE_SESSIONS;
            // Check cache first
            const cached = this.redis.getCache(cacheKey);
            if (cached) {
                return {
                    success: true,
                    data: cached,
                    count: cached.length
                };
            }
            // Get all sessions created in the last hour
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const sessionIds = await this.redis.smembers(this.getSessionIndexKey());
            if (sessionIds.length === 0) {
                return {
                    success: true,
                    data: [],
                    count: 0
                };
            }
            // Batch get all sessions
            const pipeline = await this.redis.pipeline();
            sessionIds.forEach(sessionId => {
                const sessionKey = this.getSessionKey(sessionId);
                pipeline.get(sessionKey);
            });
            const results = await pipeline.exec();
            const activeSessions = [];
            results.forEach((result, index) => {
                if (result && typeof result === 'string') {
                    try {
                        const session = JSON.parse(result);
                        // Filter for recently active sessions
                        if (session.updatedAt > oneHourAgo) {
                            activeSessions.push(session);
                        }
                    }
                    catch (parseError) {
                        console.warn(`Failed to parse session ${sessionIds[index]}:`, parseError);
                    }
                }
            });
            // Cache the result for 5 minutes
            this.redis.setCache(cacheKey, activeSessions, 300);
            return {
                success: true,
                data: activeSessions,
                count: activeSessions.length
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to get active sessions: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async searchSessions(query, limit) {
        try {
            // Use Redis SCAN for efficient pattern matching
            const pattern = `${KEY_PATTERNS.session}:*${query}*`;
            const keys = await this.redis.keys(pattern);
            if (keys.length === 0) {
                return {
                    success: true,
                    data: [],
                    count: 0
                };
            }
            // Apply limit
            const limitedKeys = limit ? keys.slice(0, limit) : keys;
            // Batch get matching sessions
            const pipeline = await this.redis.pipeline();
            limitedKeys.forEach(key => pipeline.get(key));
            const results = await pipeline.exec();
            const sessions = [];
            results.forEach((result, index) => {
                if (result && typeof result === 'string') {
                    try {
                        const session = JSON.parse(result);
                        sessions.push(session);
                    }
                    catch (parseError) {
                        console.warn(`Failed to parse session at key ${limitedKeys[index]}:`, parseError);
                    }
                }
            });
            return {
                success: true,
                data: sessions,
                count: sessions.length
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to search sessions: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async getSessionStats() {
        try {
            const indexKey = this.getSessionIndexKey();
            const totalSessions = await this.redis.smembers(indexKey);
            let activeCount = 0;
            let expiredCount = 0;
            if (totalSessions.length > 0) {
                // Batch check TTL for all sessions
                const pipeline = await this.redis.pipeline();
                totalSessions.forEach(sessionId => {
                    const sessionKey = this.getSessionKey(sessionId);
                    pipeline.ttl(sessionKey);
                });
                const ttls = await pipeline.exec();
                ttls.forEach((ttl) => {
                    if (ttl === -2) {
                        expiredCount++;
                    }
                    else {
                        activeCount++;
                    }
                });
            }
            return {
                success: true,
                data: {
                    total: totalSessions.length,
                    active: activeCount,
                    expired: expiredCount
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to get session stats: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async cleanupExpiredSessions() {
        try {
            const indexKey = this.getSessionIndexKey();
            const sessionIds = await this.redis.smembers(indexKey);
            let cleanedCount = 0;
            if (sessionIds.length > 0) {
                // Check each session and remove expired ones
                const pipeline = await this.redis.pipeline();
                sessionIds.forEach(sessionId => {
                    const sessionKey = this.getSessionKey(sessionId);
                    pipeline.ttl(sessionKey);
                });
                const ttls = await pipeline.exec();
                const expiredSessions = [];
                ttls.forEach((ttl, index) => {
                    if (ttl === -2) {
                        expiredSessions.push(sessionIds[index]);
                    }
                });
                if (expiredSessions.length > 0) {
                    // Remove expired sessions from index
                    await this.redis.srem(indexKey, ...expiredSessions);
                    cleanedCount = expiredSessions.length;
                }
            }
            return {
                success: true,
                data: cleanedCount,
                count: cleanedCount
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to cleanup expired sessions: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}
//# sourceMappingURL=session-crud.js.map