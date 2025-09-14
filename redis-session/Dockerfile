# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci
# Install MCP SDK peer dependency
RUN npm install @modelcontextprotocol/sdk@^0.5.0

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S mcpuser -u 1001

# Change ownership of the app directory
RUN chown -R mcpuser:nodejs /app
USER mcpuser

# Expose port (MCP typically uses stdio, but exposing for debugging)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check')" || exit 1

# Start the application
CMD ["npm", "start"]
