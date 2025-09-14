# MCP Redis Server

A scalable and efficient MCP (Model Context Protocol) Redis server that provides comprehensive CRUD operations for info, sessions, and messages with advanced features like batch operations, smart caching, optimized keys, and lazy loading.

## 🚀 Quick Start

### For End Users

**Install globally:**
```bash
npm install -g mcp-redis-server
```

**Set up Redis (choose one):**
```bash
# Local Redis
brew install redis && brew services start redis  # macOS
sudo apt install redis-server && sudo systemctl start redis  # Ubuntu

# Docker Redis
docker run -d -p 6379:6379 redis:7-alpine

# Or use any cloud Redis (AWS ElastiCache, Redis Cloud, etc.)
```

**Run the server:**
```bash
export REDIS_HOST=localhost
export REDIS_PORT=6379
export REDIS_PASSWORD=""  # Optional
mcp-redis-server
```

**Or with MCP client config:**
```json
{
  "mcpServers": {
    "redis": {
      "command": "mcp-redis-server",
      "env": {
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379",
        "REDIS_PASSWORD": ""
      }
    }
  }
}
```

### For Production (One-Command Deploy)

**Docker Compose with everything included:**
```bash
curl -O https://raw.githubusercontent.com/yourusername/mcp-redis-server/main/docker-compose.prod.yml
echo "REDIS_PASSWORD=your-secure-password" > .env
docker-compose -f docker-compose.prod.yml up -d
```

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

## 📋 Available Tools

The server provides 37 MCP tools organized into categories:

### Info CRUD (8 tools)
- `create_info` - Create info items with categories
- `get_info` - Retrieve specific info items
- `list_info` - List items with filtering
- `update_info` - Update existing items
- `delete_info` - Delete specific items
- `delete_category` - Delete entire categories
- `search_info` - Search by query string
- `get_category_info` - Get category statistics

### Session CRUD (9 tools)
- `create_session` - Create sessions with metadata
- `get_session` - Retrieve session data
- `list_sessions` - List with patterns/limits
- `update_session` - Update session metadata
- `delete_session` - Delete sessions and messages
- `search_sessions` - Search sessions by query
- `get_active_sessions` - Get recently active sessions
- `get_session_stats` - Session statistics
- `cleanup_expired_sessions` - Clean up expired sessions

### Message CRUD (9 tools)
- `create_message` - Create messages in sessions
- `get_message` - Retrieve specific messages
- `get_messages` - Get messages with pagination
- `search_messages` - Search message content
- `update_message` - Update message content/metadata
- `delete_message` - Delete specific messages
- `delete_all_messages` - Delete all session messages
- `get_message_count` - Count messages in session
- `get_recent_messages` - Get recent messages by time

### Batch Operations (11 tools)
- `execute_batch_operations` - Execute multiple operations
- `bulk_create_info` - Create multiple info items
- `bulk_create_sessions` - Create multiple sessions
- `bulk_create_messages` - Create multiple messages
- `bulk_delete_info` - Delete multiple info items
- `bulk_delete_sessions` - Delete multiple sessions
- `bulk_update_info` - Update multiple info items
- `get_batch_stats` - Get data statistics
- `cleanup_expired_data` - Clean up expired data
- `get_redis_info` - Redis connection status
- `clear_cache` - Clear in-memory cache

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis server hostname | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `REDIS_PASSWORD` | Redis password (optional) | - |
| `REDIS_DB` | Redis database number | `0` |
| `CACHE_TTL` | Cache TTL in seconds | `3600` |
| `BATCH_SIZE` | Default batch size | `100` |
| `MAX_CONNECTIONS` | Max Redis connections | `10` |
| `LOG_LEVEL` | Logging level | `info` |

### Redis Key Patterns

The server uses optimized key patterns:
- **Info**: `i:category:key` (e.g., `i:business:hours`)
- **Sessions**: `s:sessionId` (e.g., `s:123`)
- **Messages**: `s:sessionId:m:messageId` (e.g., `s:123:m:msg_123`)
- **Categories**: `c:category` (e.g., `c:business`)

## 💻 Development Setup

### Prerequisites
- Node.js 18+
- Redis 6+
- Docker (optional)

### Local Development

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd mcp-redis-server
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your Redis configuration
   ```

3. **Start Redis:**
   ```bash
   redis-server  # or docker run -d -p 6379:6379 redis:7-alpine
   ```

4. **Build and run:**
   ```bash
   npm run build
   npm start
   ```

### Docker Development

```bash
# Start everything (Redis + MCP server + Redis Commander)
docker-compose up -d

# View logs
docker-compose logs -f

# Test the server
./quick-test.sh
```

### Testing

```bash
# Run the comprehensive test script
./quick-test.sh

# Or test individual components
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | timeout 3s node dist/server.js
```

## 🏭 Production Deployment

### Option 1: Docker Compose (Recommended)

**Complete production setup:**
```bash
# Download production config
curl -O https://raw.githubusercontent.com/yourusername/mcp-redis-server/main/docker-compose.prod.yml

# Set secure password
echo "REDIS_PASSWORD=your-secure-password" > .env

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Optional: Include Redis Commander for management
docker-compose -f docker-compose.prod.yml --profile tools up -d
```

### Option 2: PM2 Process Manager

```bash
# Install PM2 and server
npm install -g pm2 mcp-redis-server

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'mcp-redis-server',
    script: 'mcp-redis-server',
    instances: 1,
    autorestart: true,
    env: {
      NODE_ENV: 'production',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      REDIS_PASSWORD: 'your-password'
    }
  }]
};
EOF

# Start and save
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 3: Systemd Service (Linux)

```bash
# Install globally
npm install -g mcp-redis-server

# Create service file
sudo tee /etc/systemd/system/mcp-redis-server.service << EOF
[Unit]
Description=MCP Redis Server
After=network.target redis.service

[Service]
Type=simple
User=mcp
Environment=NODE_ENV=production
Environment=REDIS_HOST=localhost
Environment=REDIS_PORT=6379
Environment=REDIS_PASSWORD=your-password
ExecStart=/usr/bin/mcp-redis-server
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable mcp-redis-server
sudo systemctl start mcp-redis-server
```

### Option 4: Cloud Platforms

**Railway:**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
# Set REDIS_HOST, REDIS_PORT, REDIS_PASSWORD in Railway dashboard
```

**Render/Fly.io/DigitalOcean:**
- Connect your GitHub repo
- Add Redis addon/service
- Set environment variables from Redis addon
- Deploy

## 🔒 Production Security

### Redis Security
```bash
# redis.conf
requirepass your-strong-password
bind 127.0.0.1
protected-mode yes
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Environment Variables
```bash
# Required
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=strong-password-here
REDIS_DB=0

# Optional
NODE_ENV=production
LOG_LEVEL=info
```

### Firewall Rules
```bash
# Only allow Redis from MCP server
ufw allow from YOUR_MCP_SERVER_IP to any port 6379
ufw deny 6379
```

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Check server status
docker-compose ps  # Docker
pm2 status         # PM2
systemctl status mcp-redis-server  # Systemd

# Check Redis
redis-cli ping
```

### Logs
```bash
# View logs
docker-compose logs -f mcp-redis-server  # Docker
pm2 logs mcp-redis-server                # PM2
journalctl -u mcp-redis-server -f        # Systemd
```

### Redis Commander Web UI
Access at `http://localhost:8081` to:
- Browse Redis keys and values
- Monitor memory usage
- Execute Redis commands
- View real-time statistics

### Updates
```bash
# Update server
npm update -g mcp-redis-server

# Restart service
docker-compose restart mcp-redis-server  # Docker
pm2 restart mcp-redis-server            # PM2
systemctl restart mcp-redis-server      # Systemd
```

## 📚 Usage Examples

### Basic Info Management
```javascript
// Create business hours
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
// Create user session
await create_session({
  sessionId: "user_123_session",
  metadata: {
    userId: "123",
    loginTime: new Date().toISOString()
  },
  ttl: 7200
});

// Update session
await update_session({
  sessionId: "user_123_session",
  updates: {
    lastActivity: new Date().toISOString()
  }
});
```

### Message Handling
```javascript
// Create conversation
await create_message({
  sessionId: "user_123_session",
  role: "user",
  content: "Hello, I need help"
});

await create_message({
  sessionId: "user_123_session",
  role: "assistant",
  content: "I'd be happy to help you!"
});

// Get messages
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

// Mixed batch operations
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

## 🔄 Performance Features

### Smart Caching
- In-memory cache with TTL-based invalidation
- Frequently accessed data cached automatically
- Cache cleanup runs every 5 minutes
- Pattern-based cache clearing

### Batch Operations
- Redis pipelines for multiple operations
- Single network round trips for bulk operations
- Atomic operations ensuring data consistency
- Configurable batch sizes

### Optimized Key Patterns
- Short key names reducing memory usage
- Hierarchical organization for efficient scanning
- Index structures for fast lookups
- Pattern matching for flexible queries

### Lazy Loading
- Pagination support for large datasets
- On-demand retrieval reducing initial load times
- Configurable limits preventing memory issues
- Efficient data structures for quick access

## 📦 Publishing (For Developers)

### NPM Publishing

1. **Setup:**
   ```bash
   npm login  # or npm adduser
   ```

2. **Publish:**
   ```bash
   npm run build
   npm publish
   ```

3. **Updates:**
   ```bash
   npm version patch  # or minor, major
   npm publish
   ```

### Docker Hub

```bash
# Build and push
docker build -t yourusername/mcp-redis-server:latest .
docker push yourusername/mcp-redis-server:latest
```

## 📋 Production Checklist

- [ ] Redis secured with password
- [ ] Environment variables configured
- [ ] Process manager setup (PM2/systemd/Docker)
- [ ] Health checks configured
- [ ] Logs rotation setup
- [ ] Monitoring in place
- [ ] Backups configured for Redis
- [ ] Firewall rules applied
- [ ] SSL/TLS if exposing externally
- [ ] Resource limits set

## 🛡️ Security Considerations

- Non-root container user for enhanced security
- Environment variable configuration for sensitive data
- Redis authentication support
- Input validation on all operations
- Error handling without data exposure

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
- Check the Redis Commander interface at http://localhost:8081
- Monitor server logs for debugging

---

**Built with ❤️ for efficient Redis-based data management in MCP environments.**
