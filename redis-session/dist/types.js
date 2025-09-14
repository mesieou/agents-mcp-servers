// Optimized key patterns for efficiency
export const KEY_PATTERNS = {
    info: 'i', // i:category:key
    session: 's', // s:sessionId
    message: 'm', // s:sessionId:m:messageId
    category: 'c', // c:category (for category metadata)
};
// Cache keys for frequently accessed data
export const CACHE_KEYS = {
    RECENT_MESSAGES: 'cache:recent:messages',
    ACTIVE_SESSIONS: 'cache:active:sessions',
    BUSINESS_INFO: 'cache:business:info',
};
//# sourceMappingURL=types.js.map