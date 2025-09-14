# MCP Redis Server

A scalable and efficient MCP (Model Context Protocol) Redis server that provides comprehensive CRUD operations for info, sessions, and messages with advanced features like batch operations, smart caching, optimized keys, and lazy loading.

## 🚀 Features

### Core CRUD Operations
- **Info Management**: Create, read, update, delete info items with category-based organization
- **Session Management**: Full session lifecycle management with metadata support
- **Message Management**: Rich message handling with search and pagination capabilities

### Performance Optimizations
- **Optimized Key Patterns**: Short, efficient Redis keys for maximum performance
- **Batch Operations**: Redis pipelines for multiple operations in single network round trips
- **Smart Caching**: Intelligent caching with TTL-based invalidation
- **Lazy Loading**: On-demand data retrieval with pagination support

### Advanced Features
- **Pattern Matching**: Efficient search across all data types
- **Bulk Operations**: Mass create, update, and delete operations
- **Data Cleanup**: Automatic cleanup of expired data
- **Statistics**: Comprehensive data statistics and monitoring

## 📁 Project Structure

```
mcp-redis-server/
├── docker-compose.yml          # Docker Compose configuration
├── Dockerfile                  # Docker container definition
├── package.json               # Node.js dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── env.example                # Environment variables template
├── README.md                  # This file
└── src/
    ├── server.ts              # Main MCP server implementation
    ├── redis-client.ts        # Redis client with connection management
    ├── types.ts               # TypeScript type definitions
    └── tools/
        ├── info-crud.ts       # Info CRUD operations
        ├── session-crud.ts    # Session CRUD operations
        ├── message-crud.ts    # Message CRUD operations
        └── batch-operations.ts # Batch operation utilities
```

## 🛠️ Installation

### Prerequisites
- Node.js 18+
- Redis 6+
- Docker (optional, for containerized deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mcp-redis-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your Redis configuration
   ```

4. **Start Redis server**
   ```bash
   redis-server
   ```

5. **Build and run the application**
   ```bash
   npm run build
   npm start
   ```

### Docker Deployment

1. **Using Docker Compose (Recommended)**
   ```bash
   docker-compose up -d
   ```

   This will start:
   - Redis server
   - MCP Redis Server
   - Redis Commander (web UI) on port 8081

2. **Manual Docker build**
   ```bash
   docker build -t mcp-redis-server .
   docker run -d --name mcp-redis-server mcp-redis-server
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis server hostname | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `REDIS_PASSWORD` | Redis password (optional) | - |
| `REDIS_DB` | Redis database number | `0` |
| `MCP_SERVER_NAME` | MCP server name | `mcp-redis-server` |
| `MCP_SERVER_VERSION` | MCP server version | `1.0.0` |
| `CACHE_TTL` | Cache TTL in seconds | `3600` |
| `BATCH_SIZE` | Default batch size | `100` |
| `MAX_CONNECTIONS` | Max Redis connections | `10` |
| `LOG_LEVEL` | Logging level | `info` |

### Redis Key Patterns

The server uses optimized key patterns for maximum efficiency:

- **Info**: `i:category:key` (e.g., `i:business:hours`)
- **Sessions**: `s:sessionId` (e.g., `s:123`)
- **Messages**: `s:sessionId:m:messageId` (e.g., `s:123:m:msg_123`)
- **Categories**: `c:category` (e.g., `c:business`)

## 📚 API Reference

### Info CRUD Operations

#### `create_info`
Create a new info item with category, key, data and optional TTL.

**Parameters:**
- `category` (string): Category for the info item
- `key` (string): Key for the info item
- `data` (string): Data content for the info item
- `ttl` (number, optional): Time to live in seconds

**Example:**
```json
{
  "category": "business",
  "key": "hours",
  "data": "9 AM - 5 PM",
  "ttl": 3600
}
```

#### `get_info`
Get an info item by category and key.

**Parameters:**
- `category` (string): Category of the info item
- `key` (string): Key of the info item

#### `list_info`
List info items with optional category filter and pattern matching.

**Parameters:**
- `category` (string, optional): Filter by category
- `pattern` (string, optional): Pattern to match

#### `update_info`
Update an existing info item.

**Parameters:**
- `category` (string): Category of the info item
- `key` (string): Key of the info item
- `data` (string): New data content
- `ttl` (number, optional): New TTL in seconds

#### `delete_info`
Delete an info item.

**Parameters:**
- `category` (string): Category of the info item
- `key` (string): Key of the info item

#### `delete_category`
Delete all info items in a category.

**Parameters:**
- `category` (string): Category to delete

### Session CRUD Operations

#### `create_session`
Create a new session with optional metadata and TTL.

**Parameters:**
- `sessionId` (string): Unique session identifier
- `metadata` (object, optional): Session metadata
- `ttl` (number, optional): Time to live in seconds

**Example:**
```json
{
  "sessionId": "user_123_session",
  "metadata": {
    "userId": "123",
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1"
  },
  "ttl": 7200
}
```

#### `get_session`
Get a session by ID.

**Parameters:**
- `sessionId` (string): Session identifier

#### `list_sessions`
List sessions with optional pattern and limit.

**Parameters:**
- `pattern` (string, optional): Pattern to match session IDs
- `limit` (number, optional): Maximum number of sessions to return

#### `update_session`
Update session metadata.

**Parameters:**
- `sessionId` (string): Session identifier
- `updates` (object): Updates to apply to session metadata

#### `delete_session`
Delete a session and all its messages.

**Parameters:**
- `sessionId` (string): Session identifier

### Message CRUD Operations

#### `create_message`
Create a new message in a session.

**Parameters:**
- `sessionId` (string): Session identifier
- `role` (string): Message role (e.g., user, assistant)
- `content` (string): Message content
- `metadata` (object, optional): Additional metadata

**Example:**
```json
{
  "sessionId": "user_123_session",
  "role": "user",
  "content": "Hello, how can I help you?",
  "metadata": {
    "timestamp": "2024-01-01T12:00:00Z",
    "source": "web"
  }
}
```

#### `get_message`
Get a specific message by session and message ID.

**Parameters:**
- `sessionId` (string): Session identifier
- `messageId` (string): Message identifier

#### `get_messages`
Get messages from a session with pagination.

**Parameters:**
- `sessionId` (string): Session identifier
- `limit` (number, optional): Maximum number of messages
- `offset` (number, optional): Number of messages to skip

#### `search_messages`
Search messages in a session by content.

**Parameters:**
- `sessionId` (string): Session identifier
- `query` (string): Search query
- `limit` (number, optional): Maximum number of results

#### `update_message`
Update a message content or metadata.

**Parameters:**
- `sessionId` (string): Session identifier
- `messageId` (string): Message identifier
- `updates` (object): Updates to apply

#### `delete_message`
Delete a specific message.

**Parameters:**
- `sessionId` (string): Session identifier
- `messageId` (string): Message identifier

#### `delete_all_messages`
Delete all messages in a session.

**Parameters:**
- `sessionId` (string): Session identifier

### Batch Operations

#### `execute_batch_operations`
Execute multiple operations in a single batch for efficiency.

**Parameters:**
- `operations` (array): Array of batch operations to execute

**Operation Object:**
```json
{
  "operation": "create|update|delete",
  "type": "info|session|message",
  "key": "identifier",
  "data": {},
  "ttl": 3600
}
```

#### `bulk_create_info`
Create multiple info items efficiently.

**Parameters:**
- `items` (array): Array of info items to create

#### `bulk_create_sessions`
Create multiple sessions efficiently.

**Parameters:**
- `sessions` (array): Array of sessions to create

#### `bulk_create_messages`
Create multiple messages efficiently.

**Parameters:**
- `messages` (array): Array of messages to create

### Utility Operations

#### `get_redis_info`
Get Redis server information and connection status.

#### `clear_cache`
Clear the in-memory cache.

**Parameters:**
- `pattern` (string, optional): Pattern to match cache keys

#### `get_batch_stats`
Get statistics about stored data.

#### `cleanup_expired_data`
Clean up expired data from Redis.

## 🔄 Performance Features

### Smart Caching
- **In-memory cache** with TTL-based invalidation
- **Frequently accessed data** cached automatically
- **Cache cleanup** runs every 5 minutes
- **Pattern-based cache clearing** for targeted invalidation

### Batch Operations
- **Redis pipelines** for multiple operations
- **Single network round trips** for bulk operations
- **Atomic operations** ensuring data consistency
- **Configurable batch sizes** for optimal performance

### Optimized Key Patterns
- **Short key names** reducing memory usage
- **Hierarchical organization** for efficient scanning
- **Index structures** for fast lookups
- **Pattern matching** for flexible queries

### Lazy Loading
- **Pagination support** for large datasets
- **On-demand retrieval** reducing initial load times
- **Configurable limits** preventing memory issues
- **Efficient data structures** for quick access

## 🚀 Usage Examples

### Basic Info Management
```javascript
// Create business hours info
await create_info({
  category: "business",
  key: "hours",
  data: "9 AM - 5 PM",
  ttl: 86400
});

// Get business info
const hours = await get_info({
  category: "business",
  key: "hours"
});
```

### Session Management
```javascript
// Create a user session
await create_session({
  sessionId: "user_123_session",
  metadata: {
    userId: "123",
    loginTime: new Date().toISOString()
  },
  ttl: 7200
});

// Update session metadata
await update_session({
  sessionId: "user_123_session",
  updates: {
    lastActivity: new Date().toISOString()
  }
});
```

### Message Handling
```javascript
// Create a conversation
await create_message({
  sessionId: "user_123_session",
  role: "user",
  content: "Hello, I need help with my order"
});

await create_message({
  sessionId: "user_123_session",
  role: "assistant",
  content: "I'd be happy to help you with your order. Can you provide your order number?"
});

// Get recent messages
const messages = await get_messages({
  sessionId: "user_123_session",
  limit: 10
});
```

### Batch Operations
```javascript
// Bulk create info items
await bulk_create_info({
  items: [
    { category: "business", key: "phone", data: "555-0123" },
    { category: "business", key: "email", data: "contact@company.com" },
    { category: "business", key: "address", data: "123 Main St" }
  ]
});

// Execute mixed batch operations
await execute_batch_operations({
  operations: [
    {
      operation: "create",
      type: "info",
      key: "business:website",
      data: { data: "https://company.com" }
    },
    {
      operation: "update",
      type: "session",
      key: "user_123_session",
      data: { lastActivity: new Date().toISOString() }
    }
  ]
});
```

## 🔍 Monitoring and Maintenance

### Redis Commander
Access the web UI at `http://localhost:8081` to:
- Browse Redis keys and values
- Monitor memory usage
- Execute Redis commands
- View real-time statistics

### Health Checks
The server includes built-in health checks:
- Redis connection status
- Memory usage monitoring
- Cache performance metrics
- Error rate tracking

### Data Cleanup
Automatic cleanup features:
- **Expired data removal** from Redis
- **Cache invalidation** for stale data
- **Session cleanup** for inactive sessions
- **Statistics tracking** for monitoring

## 🛡️ Security Considerations

- **Non-root container** user for enhanced security
- **Environment variable** configuration for sensitive data
- **Redis authentication** support
- **Input validation** on all operations
- **Error handling** without data exposure

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the Redis Commander interface
- Monitor server logs for debugging

## 🔄 Version History

- **v1.0.0** - Initial release with full CRUD operations, batch processing, and caching
- **Future versions** will include additional features like data encryption, advanced analytics, and integration with other MCP servers

---

**Built with ❤️ for efficient Redis-based data management in MCP environments.**
