#!/usr/bin/env node

// @ts-ignore - MCP SDK is a peer dependency
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// @ts-ignore - MCP SDK is a peer dependency
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// @ts-ignore - MCP SDK is a peer dependency
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
// @ts-ignore - MCP SDK is a peer dependency
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { RedisClient } from './redis-client.js';
import { InfoCRUD } from './tools/info-crud.js';
import { SessionCRUD } from './tools/session-crud.js';
import { MessageCRUD } from './tools/message-crud.js';
import { BatchOperations } from './tools/batch-operations.js';
import { RedisConfig, CacheConfig } from './types.js';

// Load environment variables
config();

const REDIS_CONFIG: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxConnections: parseInt(process.env.MAX_CONNECTIONS || '10')
};

const CACHE_CONFIG: CacheConfig = {
  ttl: parseInt(process.env.CACHE_TTL || '3600'),
  batchSize: parseInt(process.env.BATCH_SIZE || '100')
};

class MCPRedisServer {
  private server: Server;
  private redis: RedisClient;
  private infoCRUD: InfoCRUD;
  private sessionCRUD: SessionCRUD;
  private messageCRUD: MessageCRUD;
  private batchOps: BatchOperations;

  constructor() {
    this.server = new Server(
      {
        name: process.env.MCP_SERVER_NAME || 'mcp-redis-server',
        version: process.env.MCP_SERVER_VERSION || '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      } as any
    );

    this.redis = new RedisClient(REDIS_CONFIG, CACHE_CONFIG);
    this.infoCRUD = new InfoCRUD(this.redis);
    this.sessionCRUD = new SessionCRUD(this.redis);
    this.messageCRUD = new MessageCRUD(this.redis);
    this.batchOps = new BatchOperations(this.redis);

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getAvailableTools(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Info CRUD Operations
          case 'create_info':
            return await this.handleCreateInfo(args);
          case 'get_info':
            return await this.handleGetInfo(args);
          case 'list_info':
            return await this.handleListInfo(args);
          case 'update_info':
            return await this.handleUpdateInfo(args);
          case 'delete_info':
            return await this.handleDeleteInfo(args);
          case 'delete_category':
            return await this.handleDeleteCategory(args);
          case 'search_info':
            return await this.handleSearchInfo(args);
          case 'get_category_info':
            return await this.handleGetCategoryInfo(args);

          // Session CRUD Operations
          case 'create_session':
            return await this.handleCreateSession(args);
          case 'get_session':
            return await this.handleGetSession(args);
          case 'list_sessions':
            return await this.handleListSessions(args);
          case 'update_session':
            return await this.handleUpdateSession(args);
          case 'delete_session':
            return await this.handleDeleteSession(args);
          case 'search_sessions':
            return await this.handleSearchSessions(args);
          case 'get_active_sessions':
            return await this.handleGetActiveSessions(args);
          case 'get_session_stats':
            return await this.handleGetSessionStats(args);
          case 'cleanup_expired_sessions':
            return await this.handleCleanupExpiredSessions(args);

          // Message CRUD Operations
          case 'create_message':
            return await this.handleCreateMessage(args);
          case 'get_message':
            return await this.handleGetMessage(args);
          case 'get_messages':
            return await this.handleGetMessages(args);
          case 'search_messages':
            return await this.handleSearchMessages(args);
          case 'update_message':
            return await this.handleUpdateMessage(args);
          case 'delete_message':
            return await this.handleDeleteMessage(args);
          case 'delete_all_messages':
            return await this.handleDeleteAllMessages(args);
          case 'get_message_count':
            return await this.handleGetMessageCount(args);
          case 'get_recent_messages':
            return await this.handleGetRecentMessages(args);

          // Batch Operations
          case 'execute_batch_operations':
            return await this.handleExecuteBatchOperations(args);
          case 'bulk_create_info':
            return await this.handleBulkCreateInfo(args);
          case 'bulk_create_sessions':
            return await this.handleBulkCreateSessions(args);
          case 'bulk_create_messages':
            return await this.handleBulkCreateMessages(args);
          case 'bulk_delete_info':
            return await this.handleBulkDeleteInfo(args);
          case 'bulk_delete_sessions':
            return await this.handleBulkDeleteSessions(args);
          case 'bulk_update_info':
            return await this.handleBulkUpdateInfo(args);
          case 'get_batch_stats':
            return await this.handleGetBatchStats(args);
          case 'cleanup_expired_data':
            return await this.handleCleanupExpiredData(args);

          // Utility Operations
          case 'get_redis_info':
            return await this.handleGetRedisInfo(args);
          case 'clear_cache':
            return await this.handleClearCache(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    });
  }

  private getAvailableTools(): Tool[] {
    return [
      // Info CRUD Tools
      {
        name: 'create_info',
        description: 'Create a new info item with category, key, data and optional TTL',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Category for the info item' },
            key: { type: 'string', description: 'Key for the info item' },
            data: { type: 'string', description: 'Data content for the info item' },
            ttl: { type: 'number', description: 'Time to live in seconds (optional)' }
          },
          required: ['category', 'key', 'data']
        }
      },
      {
        name: 'get_info',
        description: 'Get an info item by category and key',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Category of the info item' },
            key: { type: 'string', description: 'Key of the info item' }
          },
          required: ['category', 'key']
        }
      },
      {
        name: 'list_info',
        description: 'List info items with optional category filter and pattern matching',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Filter by category (optional)' },
            pattern: { type: 'string', description: 'Pattern to match (optional)' }
          }
        }
      },
      {
        name: 'update_info',
        description: 'Update an existing info item',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Category of the info item' },
            key: { type: 'string', description: 'Key of the info item' },
            data: { type: 'string', description: 'New data content' },
            ttl: { type: 'number', description: 'New TTL in seconds (optional)' }
          },
          required: ['category', 'key', 'data']
        }
      },
      {
        name: 'delete_info',
        description: 'Delete an info item',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Category of the info item' },
            key: { type: 'string', description: 'Key of the info item' }
          },
          required: ['category', 'key']
        }
      },
      {
        name: 'delete_category',
        description: 'Delete all info items in a category',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Category to delete' }
          },
          required: ['category']
        }
      },
      {
        name: 'search_info',
        description: 'Search info items by query string',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            category: { type: 'string', description: 'Filter by category (optional)' }
          },
          required: ['query']
        }
      },
      {
        name: 'get_category_info',
        description: 'Get information about a category including count and keys',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Category name' }
          },
          required: ['category']
        }
      },

      // Session CRUD Tools
      {
        name: 'create_session',
        description: 'Create a new session with optional metadata and TTL',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Unique session identifier' },
            metadata: { type: 'object', description: 'Session metadata (optional)' },
            ttl: { type: 'number', description: 'Time to live in seconds (optional)' }
          },
          required: ['sessionId']
        }
      },
      {
        name: 'get_session',
        description: 'Get a session by ID',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session identifier' }
          },
          required: ['sessionId']
        }
      },
      {
        name: 'list_sessions',
        description: 'List sessions with optional pattern and limit',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Pattern to match session IDs (optional)' },
            limit: { type: 'number', description: 'Maximum number of sessions to return (optional)' }
          }
        }
      },
      {
        name: 'update_session',
        description: 'Update session metadata',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session identifier' },
            updates: { type: 'object', description: 'Updates to apply to session metadata' }
          },
          required: ['sessionId', 'updates']
        }
      },
      {
        name: 'delete_session',
        description: 'Delete a session and all its messages',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session identifier' }
          },
          required: ['sessionId']
        }
      },
      {
        name: 'search_sessions',
        description: 'Search sessions by query string',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Maximum number of results (optional)' }
          },
          required: ['query']
        }
      },
      {
        name: 'get_active_sessions',
        description: 'Get recently active sessions',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_session_stats',
        description: 'Get session statistics including total, active, and expired counts',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'cleanup_expired_sessions',
        description: 'Clean up expired sessions from the index',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },

      // Message CRUD Tools
      {
        name: 'create_message',
        description: 'Create a new message in a session',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session identifier' },
            role: { type: 'string', description: 'Message role (e.g., user, assistant)' },
            content: { type: 'string', description: 'Message content' },
            metadata: { type: 'object', description: 'Additional metadata (optional)' }
          },
          required: ['sessionId', 'role', 'content']
        }
      },
      {
        name: 'get_message',
        description: 'Get a specific message by session and message ID',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session identifier' },
            messageId: { type: 'string', description: 'Message identifier' }
          },
          required: ['sessionId', 'messageId']
        }
      },
      {
        name: 'get_messages',
        description: 'Get messages from a session with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session identifier' },
            limit: { type: 'number', description: 'Maximum number of messages (optional)' },
            offset: { type: 'number', description: 'Number of messages to skip (optional)' }
          },
          required: ['sessionId']
        }
      },
      {
        name: 'search_messages',
        description: 'Search messages in a session by content',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session identifier' },
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number', description: 'Maximum number of results (optional)' }
          },
          required: ['sessionId', 'query']
        }
      },
      {
        name: 'update_message',
        description: 'Update a message content or metadata',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session identifier' },
            messageId: { type: 'string', description: 'Message identifier' },
            updates: { type: 'object', description: 'Updates to apply' }
          },
          required: ['sessionId', 'messageId', 'updates']
        }
      },
      {
        name: 'delete_message',
        description: 'Delete a specific message',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session identifier' },
            messageId: { type: 'string', description: 'Message identifier' }
          },
          required: ['sessionId', 'messageId']
        }
      },
      {
        name: 'delete_all_messages',
        description: 'Delete all messages in a session',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session identifier' }
          },
          required: ['sessionId']
        }
      },
      {
        name: 'get_message_count',
        description: 'Get the count of messages in a session',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session identifier' }
          },
          required: ['sessionId']
        }
      },
      {
        name: 'get_recent_messages',
        description: 'Get recent messages from a session',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', description: 'Session identifier' },
            hours: { type: 'number', description: 'Number of hours to look back (default: 24)' }
          },
          required: ['sessionId']
        }
      },

      // Batch Operation Tools
      {
        name: 'execute_batch_operations',
        description: 'Execute multiple operations in a single batch for efficiency',
        inputSchema: {
          type: 'object',
          properties: {
            operations: {
              type: 'array',
              description: 'Array of batch operations to execute',
              items: {
                type: 'object',
                properties: {
                  operation: { type: 'string', enum: ['create', 'update', 'delete'] },
                  type: { type: 'string', enum: ['info', 'session', 'message'] },
                  key: { type: 'string', description: 'Key identifier' },
                  data: { type: 'object', description: 'Data for create/update operations' },
                  ttl: { type: 'number', description: 'TTL for create operations' }
                },
                required: ['operation', 'type', 'key']
              }
            }
          },
          required: ['operations']
        }
      },
      {
        name: 'bulk_create_info',
        description: 'Create multiple info items efficiently',
        inputSchema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              description: 'Array of info items to create',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  key: { type: 'string' },
                  data: { type: 'string' },
                  ttl: { type: 'number' }
                },
                required: ['category', 'key', 'data']
              }
            }
          },
          required: ['items']
        }
      },
      {
        name: 'bulk_create_sessions',
        description: 'Create multiple sessions efficiently',
        inputSchema: {
          type: 'object',
          properties: {
            sessions: {
              type: 'array',
              description: 'Array of sessions to create',
              items: {
                type: 'object',
                properties: {
                  sessionId: { type: 'string' },
                  metadata: { type: 'object' },
                  ttl: { type: 'number' }
                },
                required: ['sessionId']
              }
            }
          },
          required: ['sessions']
        }
      },
      {
        name: 'bulk_create_messages',
        description: 'Create multiple messages efficiently',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of messages to create',
              items: {
                type: 'object',
                properties: {
                  sessionId: { type: 'string' },
                  role: { type: 'string' },
                  content: { type: 'string' },
                  metadata: { type: 'object' }
                },
                required: ['sessionId', 'role', 'content']
              }
            }
          },
          required: ['messages']
        }
      },
      {
        name: 'bulk_delete_info',
        description: 'Delete multiple info items efficiently',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Category of info items' },
            keys: { type: 'array', items: { type: 'string' }, description: 'Array of keys to delete' }
          },
          required: ['category', 'keys']
        }
      },
      {
        name: 'bulk_delete_sessions',
        description: 'Delete multiple sessions efficiently',
        inputSchema: {
          type: 'object',
          properties: {
            sessionIds: { type: 'array', items: { type: 'string' }, description: 'Array of session IDs to delete' }
          },
          required: ['sessionIds']
        }
      },
      {
        name: 'bulk_update_info',
        description: 'Update multiple info items efficiently',
        inputSchema: {
          type: 'object',
          properties: {
            updates: {
              type: 'array',
              description: 'Array of info updates',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  key: { type: 'string' },
                  data: { type: 'string' },
                  ttl: { type: 'number' }
                },
                required: ['category', 'key', 'data']
              }
            }
          },
          required: ['updates']
        }
      },
      {
        name: 'get_batch_stats',
        description: 'Get statistics about stored data',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'cleanup_expired_data',
        description: 'Clean up expired data from Redis',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },

      // Utility Tools
      {
        name: 'get_redis_info',
        description: 'Get Redis server information and connection status',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'clear_cache',
        description: 'Clear the in-memory cache',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: { type: 'string', description: 'Pattern to match cache keys (optional)' }
          }
        }
      }
    ];
  }

  // Info CRUD Handlers
  private async handleCreateInfo(args: any): Promise<CallToolResult> {
    const result = await this.infoCRUD.createInfo(args.category, args.key, args.data, args.ttl);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleGetInfo(args: any): Promise<CallToolResult> {
    const result = await this.infoCRUD.getInfo(args.category, args.key);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleListInfo(args: any): Promise<CallToolResult> {
    const result = await this.infoCRUD.listInfo(args.category, args.pattern);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleUpdateInfo(args: any): Promise<CallToolResult> {
    const result = await this.infoCRUD.updateInfo(args.category, args.key, args.data, args.ttl);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleDeleteInfo(args: any): Promise<CallToolResult> {
    const result = await this.infoCRUD.deleteInfo(args.category, args.key);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleDeleteCategory(args: any): Promise<CallToolResult> {
    const result = await this.infoCRUD.deleteCategory(args.category);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleSearchInfo(args: any): Promise<CallToolResult> {
    const result = await this.infoCRUD.searchInfo(args.query, args.category);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleGetCategoryInfo(args: any): Promise<CallToolResult> {
    const result = await this.infoCRUD.getCategoryInfo(args.category);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  // Session CRUD Handlers
  private async handleCreateSession(args: any): Promise<CallToolResult> {
    const result = await this.sessionCRUD.createSession(args.sessionId, args.metadata, args.ttl);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleGetSession(args: any): Promise<CallToolResult> {
    const result = await this.sessionCRUD.getSession(args.sessionId);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleListSessions(args: any): Promise<CallToolResult> {
    const result = await this.sessionCRUD.listSessions(args.pattern, args.limit);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleUpdateSession(args: any): Promise<CallToolResult> {
    const result = await this.sessionCRUD.updateSession(args.sessionId, args.updates);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleDeleteSession(args: any): Promise<CallToolResult> {
    const result = await this.sessionCRUD.deleteSession(args.sessionId);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleSearchSessions(args: any): Promise<CallToolResult> {
    const result = await this.sessionCRUD.searchSessions(args.query, args.limit);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleGetActiveSessions(args: any): Promise<CallToolResult> {
    const result = await this.sessionCRUD.getActiveSessions();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleGetSessionStats(args: any): Promise<CallToolResult> {
    const result = await this.sessionCRUD.getSessionStats();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleCleanupExpiredSessions(args: any): Promise<CallToolResult> {
    const result = await this.sessionCRUD.cleanupExpiredSessions();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  // Message CRUD Handlers
  private async handleCreateMessage(args: any): Promise<CallToolResult> {
    const result = await this.messageCRUD.createMessage(args.sessionId, args.role, args.content, args.metadata);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleGetMessage(args: any): Promise<CallToolResult> {
    const result = await this.messageCRUD.getMessage(args.sessionId, args.messageId);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleGetMessages(args: any): Promise<CallToolResult> {
    const result = await this.messageCRUD.getMessages(args.sessionId, args.limit, args.offset);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleSearchMessages(args: any): Promise<CallToolResult> {
    const result = await this.messageCRUD.searchMessages(args.sessionId, args.query, args.limit);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleUpdateMessage(args: any): Promise<CallToolResult> {
    const result = await this.messageCRUD.updateMessage(args.sessionId, args.messageId, args.updates);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleDeleteMessage(args: any): Promise<CallToolResult> {
    const result = await this.messageCRUD.deleteMessage(args.sessionId, args.messageId);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleDeleteAllMessages(args: any): Promise<CallToolResult> {
    const result = await this.messageCRUD.deleteAllMessages(args.sessionId);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleGetMessageCount(args: any): Promise<CallToolResult> {
    const result = await this.messageCRUD.getMessageCount(args.sessionId);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleGetRecentMessages(args: any): Promise<CallToolResult> {
    const result = await this.messageCRUD.getRecentMessages(args.sessionId, args.hours);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  // Batch Operation Handlers
  private async handleExecuteBatchOperations(args: any): Promise<CallToolResult> {
    const result = await this.batchOps.executeBatchOperations(args.operations);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleBulkCreateInfo(args: any): Promise<CallToolResult> {
    const result = await this.batchOps.bulkCreateInfo(args.items);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleBulkCreateSessions(args: any): Promise<CallToolResult> {
    const result = await this.batchOps.bulkCreateSessions(args.sessions);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleBulkCreateMessages(args: any): Promise<CallToolResult> {
    const result = await this.batchOps.bulkCreateMessages(args.messages);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleBulkDeleteInfo(args: any): Promise<CallToolResult> {
    const result = await this.batchOps.bulkDeleteInfo(args.category, args.keys);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleBulkDeleteSessions(args: any): Promise<CallToolResult> {
    const result = await this.batchOps.bulkDeleteSessions(args.sessionIds);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleBulkUpdateInfo(args: any): Promise<CallToolResult> {
    const result = await this.batchOps.bulkUpdateInfo(args.updates);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleGetBatchStats(args: any): Promise<CallToolResult> {
    const result = await this.batchOps.getBatchStats();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async handleCleanupExpiredData(args: any): Promise<CallToolResult> {
    const result = await this.batchOps.cleanupExpiredData();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  // Utility Handlers
  private async handleGetRedisInfo(args: any): Promise<CallToolResult> {
    const isConnected = this.redis.isConnected();
    const info = {
      connected: isConnected,
      config: REDIS_CONFIG,
      cacheConfig: CACHE_CONFIG,
      timestamp: new Date().toISOString()
    };
    return {
      content: [{ type: 'text', text: JSON.stringify(info, null, 2) }],
    };
  }

  private async handleClearCache(args: any): Promise<CallToolResult> {
    this.redis.clearCache(args.pattern);
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Cache cleared' }, null, 2) }],
    };
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error: any) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      console.log('Shutting down MCP Redis Server...');
      await this.redis.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Shutting down MCP Redis Server...');
      await this.redis.disconnect();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    try {
      // Connect to Redis
      await this.redis.connect();
      console.log('Connected to Redis successfully');

      // Start cache cleanup interval
      setInterval(() => {
        this.redis.cleanupCache();
      }, 5 * 60 * 1000); // Every 5 minutes

      // Start the server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.log('MCP Redis Server started successfully');
    } catch (error) {
      console.error('Failed to start MCP Redis Server:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new MCPRedisServer();
server.run().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
