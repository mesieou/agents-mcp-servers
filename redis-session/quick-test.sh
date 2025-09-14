#!/bin/bash

# Quick MCP Redis Server Test Script
# This script properly handles the MCP server lifecycle

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo_color() {
    echo -e "${2}${1}${NC}"
}

# Function to send MCP command with timeout
send_mcp_command() {
    local json_command="$1"
    local description="$2"

    echo_color "🔄 $description" "$BLUE"

    # Use timeout to prevent hanging and capture just the JSON response
    result=$(docker exec mcp-redis-server sh -c "echo '$json_command' | timeout 3s node dist/server.js 2>/dev/null" | grep -E '^\{"result"' | head -1)

    if [ -n "$result" ]; then
        echo_color "✅ Success!" "$GREEN"
        echo "$result" | jq -r '.result.content[0].text // .result' | jq . 2>/dev/null || echo "$result"
    else
        echo_color "❌ No response received" "$YELLOW"
    fi
    echo
}

# Test 1: List tools
send_mcp_command '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' "Listing available tools"

# Test 2: Create info
send_mcp_command '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "create_info", "arguments": {"category": "test", "key": "sample", "data": "Hello World!"}}}' "Creating info item"

# Test 3: Get info
send_mcp_command '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "get_info", "arguments": {"category": "test", "key": "sample"}}}' "Retrieving info item"

# Test 4: Create session
SESSION_ID="test-session-$(date +%s)"
send_mcp_command "{\"jsonrpc\": \"2.0\", \"id\": 4, \"method\": \"tools/call\", \"params\": {\"name\": \"create_session\", \"arguments\": {\"sessionId\": \"$SESSION_ID\", \"metadata\": {\"user\": \"tester\"}}}}" "Creating session: $SESSION_ID"

# Test 5: Create message
send_mcp_command "{\"jsonrpc\": \"2.0\", \"id\": 5, \"method\": \"tools/call\", \"params\": {\"name\": \"create_message\", \"arguments\": {\"sessionId\": \"$SESSION_ID\", \"role\": \"user\", \"content\": \"Test message from script\"}}}" "Creating message in session"

# Test 6: Get Redis info
send_mcp_command '{"jsonrpc": "2.0", "id": 6, "method": "tools/call", "params": {"name": "get_redis_info", "arguments": {}}}' "Getting Redis connection info"

echo_color "🎉 All tests completed!" "$GREEN"
echo_color "💡 You can also:" "$BLUE"
echo "   • Visit Redis Commander: http://localhost:8081"
echo "   • Check Redis directly: docker exec -it mcp-redis redis-cli"
echo "   • View logs: docker-compose logs mcp-server"
