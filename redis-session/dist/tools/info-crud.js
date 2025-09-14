import { KEY_PATTERNS, CACHE_KEYS } from '../types.js';
export class InfoCRUD {
    constructor(redis) {
        this.redis = redis;
    }
    getInfoKey(category, key) {
        return `${KEY_PATTERNS.info}:${category}:${key}`;
    }
    getCategoryKey(category) {
        return `${KEY_PATTERNS.category}:${category}`;
    }
    async createInfo(category, key, data, ttl) {
        try {
            const infoKey = this.getInfoKey(category, key);
            const categoryKey = this.getCategoryKey(category);
            // Check if info already exists
            const exists = await this.redis.exists(infoKey);
            if (exists) {
                return {
                    success: false,
                    error: `Info with category '${category}' and key '${key}' already exists`
                };
            }
            const now = new Date().toISOString();
            const infoItem = {
                category,
                key,
                data,
                ttl,
                createdAt: now,
                updatedAt: now
            };
            // Store the info item
            await this.redis.set(infoKey, JSON.stringify(infoItem), ttl);
            // Add to category index for efficient listing
            await this.redis.sadd(categoryKey, key);
            // Set category TTL if specified
            if (ttl) {
                await this.redis.expire(categoryKey, ttl);
            }
            // Clear cache for this category
            this.redis.clearCache(`${CACHE_KEYS.BUSINESS_INFO}:${category}`);
            return {
                success: true,
                data: infoItem
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to create info: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async getInfo(category, key) {
        try {
            const cacheKey = `${CACHE_KEYS.BUSINESS_INFO}:${category}:${key}`;
            // Check cache first
            const cached = this.redis.getCache(cacheKey);
            if (cached) {
                return {
                    success: true,
                    data: cached
                };
            }
            const infoKey = this.getInfoKey(category, key);
            const data = await this.redis.get(infoKey);
            if (!data) {
                return {
                    success: false,
                    error: `Info with category '${category}' and key '${key}' not found`
                };
            }
            const infoItem = JSON.parse(data);
            // Cache the result
            this.redis.setCache(cacheKey, infoItem);
            return {
                success: true,
                data: infoItem
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to get info: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async listInfo(category, pattern) {
        try {
            let keys = [];
            if (category) {
                // Get all keys for a specific category
                const categoryKey = this.getCategoryKey(category);
                const infoKeys = await this.redis.smembers(categoryKey);
                keys = infoKeys.map(key => this.getInfoKey(category, key));
            }
            else {
                // Get all info keys with optional pattern
                const searchPattern = pattern
                    ? `${KEY_PATTERNS.info}:*${pattern}*`
                    : `${KEY_PATTERNS.info}:*`;
                keys = await this.redis.keys(searchPattern);
            }
            if (keys.length === 0) {
                return {
                    success: true,
                    data: [],
                    count: 0
                };
            }
            // Batch get all values
            const pipeline = await this.redis.pipeline();
            keys.forEach(key => pipeline.get(key));
            const results = await pipeline.exec();
            const infoItems = [];
            results.forEach((result, index) => {
                if (result && typeof result === 'string') {
                    try {
                        const infoItem = JSON.parse(result);
                        infoItems.push(infoItem);
                    }
                    catch (parseError) {
                        console.warn(`Failed to parse info item at key ${keys[index]}:`, parseError);
                    }
                }
            });
            return {
                success: true,
                data: infoItems,
                count: infoItems.length
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to list info: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async updateInfo(category, key, data, ttl) {
        try {
            const infoKey = this.getInfoKey(category, key);
            const existingData = await this.redis.get(infoKey);
            if (!existingData) {
                return {
                    success: false,
                    error: `Info with category '${category}' and key '${key}' not found`
                };
            }
            const existingInfo = JSON.parse(existingData);
            const updatedInfo = {
                ...existingInfo,
                data,
                ttl,
                updatedAt: new Date().toISOString()
            };
            // Update the info item
            await this.redis.set(infoKey, JSON.stringify(updatedInfo), ttl);
            // Clear cache
            this.redis.clearCache(`${CACHE_KEYS.BUSINESS_INFO}:${category}:${key}`);
            return {
                success: true,
                data: updatedInfo
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to update info: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async deleteInfo(category, key) {
        try {
            const infoKey = this.getInfoKey(category, key);
            const categoryKey = this.getCategoryKey(category);
            // Check if info exists
            const exists = await this.redis.exists(infoKey);
            if (!exists) {
                return {
                    success: false,
                    error: `Info with category '${category}' and key '${key}' not found`
                };
            }
            // Delete the info item
            await this.redis.del(infoKey);
            // Remove from category index
            await this.redis.srem(categoryKey, key);
            // Clear cache
            this.redis.clearCache(`${CACHE_KEYS.BUSINESS_INFO}:${category}:${key}`);
            return {
                success: true,
                data: true
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to delete info: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async deleteCategory(category) {
        try {
            const categoryKey = this.getCategoryKey(category);
            // Get all keys in the category
            const infoKeys = await this.redis.smembers(categoryKey);
            if (infoKeys.length === 0) {
                return {
                    success: true,
                    data: 0,
                    count: 0
                };
            }
            // Delete all info items in the category
            const pipeline = await this.redis.pipeline();
            infoKeys.forEach(key => {
                const infoKey = this.getInfoKey(category, key);
                pipeline.del(infoKey);
            });
            // Delete the category index
            pipeline.del(categoryKey);
            await pipeline.exec();
            // Clear cache for this category
            this.redis.clearCache(`${CACHE_KEYS.BUSINESS_INFO}:${category}`);
            return {
                success: true,
                data: infoKeys.length,
                count: infoKeys.length
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to delete category: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async getCategoryInfo(category) {
        try {
            const categoryKey = this.getCategoryKey(category);
            const keys = await this.redis.smembers(categoryKey);
            return {
                success: true,
                data: {
                    category,
                    count: keys.length,
                    keys
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to get category info: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    async searchInfo(query, category) {
        try {
            // Use Redis SCAN for efficient pattern matching
            const pattern = category
                ? `${KEY_PATTERNS.info}:${category}:*${query}*`
                : `${KEY_PATTERNS.info}:*${query}*`;
            const keys = await this.redis.keys(pattern);
            if (keys.length === 0) {
                return {
                    success: true,
                    data: [],
                    count: 0
                };
            }
            // Batch get matching items
            const pipeline = await this.redis.pipeline();
            keys.forEach(key => pipeline.get(key));
            const results = await pipeline.exec();
            const infoItems = [];
            results.forEach((result, index) => {
                if (result && typeof result === 'string') {
                    try {
                        const infoItem = JSON.parse(result);
                        infoItems.push(infoItem);
                    }
                    catch (parseError) {
                        console.warn(`Failed to parse info item at key ${keys[index]}:`, parseError);
                    }
                }
            });
            return {
                success: true,
                data: infoItems,
                count: infoItems.length
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to search info: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}
//# sourceMappingURL=info-crud.js.map