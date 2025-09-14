import { RedisClient } from '../redis-client.js';
import { InfoItem, MCPToolResult, SearchOptions, KEY_PATTERNS, CACHE_KEYS } from '../types.js';

export class InfoCRUD {
  private redis: RedisClient;

  constructor(redis: RedisClient) {
    this.redis = redis;
  }

  private getInfoKey(category: string, key: string): string {
    return `${KEY_PATTERNS.info}:${category}:${key}`;
  }

  private getCategoryKey(category: string): string {
    return `${KEY_PATTERNS.category}:${category}`;
  }

  async createInfo(category: string, key: string, data: string, ttl?: number): Promise<MCPToolResult<InfoItem>> {
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
      const infoItem: InfoItem = {
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
    } catch (error) {
      return {
        success: false,
        error: `Failed to create info: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getInfo(category: string, key: string): Promise<MCPToolResult<InfoItem>> {
    try {
      const cacheKey = `${CACHE_KEYS.BUSINESS_INFO}:${category}:${key}`;

      // Check cache first
      const cached = this.redis.getCache<InfoItem>(cacheKey);
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

      const infoItem: InfoItem = JSON.parse(data);

      // Cache the result
      this.redis.setCache(cacheKey, infoItem);

      return {
        success: true,
        data: infoItem
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get info: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async listInfo(category?: string, pattern?: string): Promise<MCPToolResult<InfoItem[]>> {
    try {
      let keys: string[] = [];

      if (category) {
        // Get all keys for a specific category
        const categoryKey = this.getCategoryKey(category);
        const infoKeys = await this.redis.smembers(categoryKey);
        keys = infoKeys.map(key => this.getInfoKey(category, key));
      } else {
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

      const infoItems: InfoItem[] = [];
      results.forEach((result, index) => {
        if (result && typeof result === 'string') {
          try {
            const infoItem: InfoItem = JSON.parse(result);
            infoItems.push(infoItem);
          } catch (parseError) {
            console.warn(`Failed to parse info item at key ${keys[index]}:`, parseError);
          }
        }
      });

      return {
        success: true,
        data: infoItems,
        count: infoItems.length
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list info: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async updateInfo(category: string, key: string, data: string, ttl?: number): Promise<MCPToolResult<InfoItem>> {
    try {
      const infoKey = this.getInfoKey(category, key);
      const existingData = await this.redis.get(infoKey);

      if (!existingData) {
        return {
          success: false,
          error: `Info with category '${category}' and key '${key}' not found`
        };
      }

      const existingInfo: InfoItem = JSON.parse(existingData);
      const updatedInfo: InfoItem = {
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
    } catch (error) {
      return {
        success: false,
        error: `Failed to update info: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async deleteInfo(category: string, key: string): Promise<MCPToolResult<boolean>> {
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
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete info: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async deleteCategory(category: string): Promise<MCPToolResult<number>> {
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
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete category: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getCategoryInfo(category: string): Promise<MCPToolResult<{ category: string; count: number; keys: string[] }>> {
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
    } catch (error) {
      return {
        success: false,
        error: `Failed to get category info: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async searchInfo(query: string, category?: string): Promise<MCPToolResult<InfoItem[]>> {
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

      const infoItems: InfoItem[] = [];
      results.forEach((result, index) => {
        if (result && typeof result === 'string') {
          try {
            const infoItem: InfoItem = JSON.parse(result);
            infoItems.push(infoItem);
          } catch (parseError) {
            console.warn(`Failed to parse info item at key ${keys[index]}:`, parseError);
          }
        }
      });

      return {
        success: true,
        data: infoItems,
        count: infoItems.length
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search info: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
