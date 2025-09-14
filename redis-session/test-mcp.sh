#!/bin/bash

# MCP Redis Server Test Script
# Usage: ./test-mcp.sh [command]

set -e

SERVER_CMD="docker exec -i mcp-redis-server node dist/server.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_color() {
    echo -e "${2}${1}${NC}"
}

test_tools_list() {
    echo_color "🔍 Testing: List available tools" "$BLUE"
    echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | $SERVER_CMD | jq '.result.tools | length'
    echo_color "✅ Tools list test completed" "$GREEN"
}

test_info_crud() {
    echo_color "📝 Testing: Info CRUD operations" "$BLUE"

    # Create
    echo "Creating info item..."
    echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "create_info", "arguments": {"category": "demo", "key": "test-key", "data": "test-data"}}}' | $SERVER_CMD > /dev/null

    # Read
    echo "Reading info item..."
    echo '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "get_info", "arguments": {"category": "demo", "key": "test-key"}}}' | $SERVER_CMD | jq -r '.result.content[0].text' | jq '.data.data'

    # Update
    echo "Updating info item..."
    echo '{"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "update_info", "arguments": {"category": "demo", "key": "test-key", "data": "updated-data"}}}' | $SERVER_CMD > /dev/null

    # Verify update
    echo "Verifying update..."
    echo '{"jsonrpc": "2.0", "id": 5, "method": "tools/call", "params": {"name": "get_info", "arguments": {"category": "demo", "key": "test-key"}}}' | $SERVER_CMD | jq -r '.result.content[0].text' | jq '.data.data'

    echo_color "✅ Info CRUD test completed" "$GREEN"
}

test_session_crud() {
    echo_color "💬 Testing: Session and Message operations" "$BLUE"

    SESSION_ID="test-session-$(date +%s)"

    # Create session
    echo "Creating session: $SESSION_ID"
    echo "{\"jsonrpc\": \"2.0\", \"id\": 6, \"method\": \"tools/call\", \"params\": {\"name\": \"create_session\", \"arguments\": {\"sessionId\": \"$SESSION_ID\", \"metadata\": {\"test\": true}}}}" | $SERVER_CMD > /dev/null

    # Create message
    echo "Creating message in session..."
    echo "{\"jsonrpc\": \"2.0\", \"id\": 7, \"method\": \"tools/call\", \"params\": {\"name\": \"create_message\", \"arguments\": {\"sessionId\": \"$SESSION_ID\", \"role\": \"user\", \"content\": \"Hello from test script!\"}}}" | $SERVER_CMD > /dev/null

    # Get messages
    echo "Getting messages from session..."
    echo "{\"jsonrpc\": \"2.0\", \"id\": 8, \"method\": \"tools/call\", \"params\": {\"name\": \"get_messages\", \"arguments\": {\"sessionId\": \"$SESSION_ID\"}}}" | $SERVER_CMD | jq -r '.result.content[0].text' | jq '.data | length'

    echo_color "✅ Session CRUD test completed" "$GREEN"
}

test_batch_operations() {
    echo_color "⚡ Testing: Batch operations" "$BLUE"

    # Bulk create info items
    echo "Creating multiple info items..."
    echo '{"jsonrpc": "2.0", "id": 9, "method": "tools/call", "params": {"name": "bulk_create_info", "arguments": {"items": [{"category": "batch", "key": "item1", "data": "data1"}, {"category": "batch", "key": "item2", "data": "data2"}, {"category": "batch", "key": "item3", "data": "data3"}]}}}' | $SERVER_CMD > /dev/null

    # List items in category
    echo "Listing items in batch category..."
    echo '{"jsonrpc": "2.0", "id": 10, "method": "tools/call", "params": {"name": "list_info", "arguments": {"category": "batch"}}}' | $SERVER_CMD | jq -r '.result.content[0].text' | jq '.data | length'

    echo_color "✅ Batch operations test completed" "$GREEN"
}

test_redis_info() {
    echo_color "🔧 Testing: Redis connection and stats" "$BLUE"

    echo "Getting Redis info..."
    echo '{"jsonrpc": "2.0", "id": 11, "method": "tools/call", "params": {"name": "get_redis_info", "arguments": {}}}' | $SERVER_CMD | jq -r '.result.content[0].text' | jq '.connected'

    echo "Getting batch stats..."
    echo '{"jsonrpc": "2.0", "id": 12, "method": "tools/call", "params": {"name": "get_batch_stats", "arguments": {}}}' | $SERVER_CMD | jq -r '.result.content[0].text' | jq '.info.totalCategories'

    echo_color "✅ Redis info test completed" "$GREEN"
}

run_all_tests() {
    echo_color "🚀 Running all MCP Redis Server tests..." "$YELLOW"
    echo

    test_tools_list
    echo
    test_info_crud
    echo
    test_session_crud
    echo
    test_batch_operations
    echo
    test_redis_info
    echo

    echo_color "🎉 All tests completed successfully!" "$GREEN"
}

# Main script logic
case "${1:-all}" in
    "tools")
        test_tools_list
        ;;
    "info")
        test_info_crud
        ;;
    "session")
        test_session_crud
        ;;
    "batch")
        test_batch_operations
        ;;
    "redis")
        test_redis_info
        ;;
    "all")
        run_all_tests
        ;;
    *)
        echo_color "Usage: $0 [tools|info|session|batch|redis|all]" "$YELLOW"
        echo "  tools   - Test tools listing"
        echo "  info    - Test info CRUD operations"
        echo "  session - Test session and message operations"
        echo "  batch   - Test batch operations"
        echo "  redis   - Test Redis connection and stats"
        echo "  all     - Run all tests (default)"
        ;;
esac
