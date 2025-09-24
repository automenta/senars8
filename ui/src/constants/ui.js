// UI Constants
export const UI_CONSTANTS = {
    // Connection related constants
    CONNECTION: {
        RECONNECT_DELAY: 3000,
        MAX_RECONNECT_ATTEMPTS: 10,
        MESSAGE_TIMEOUT: 15000,
        PENDING_MESSAGE_MAX_SIZE: 64 * 1024, // 64KB
    },

    // UI related constants
    UI: {
        MAX_MESSAGE_HISTORY: 50,
        MAX_NOTIFICATIONS: 100,
        DEFAULT_NOTIFICATION_DURATION: 5000,
        MAX_NOTIFICATION_HISTORY: 30, // Limit for notification history to prevent memory issues
    },

    // Validation constants
    VALIDATION: {
        MAX_INPUT_LENGTH: 1000,
        MAX_TERM_LENGTH: 500,
    },

    // Layout constants
    LAYOUT: {
        DEFAULT_PRESET_NAME: 'default',
        LAYOUT_STORAGE_KEY: 'senars-ide-layout',
        PRESET_LAYOUTS_STORAGE_KEY: 'senars-ide-preset-layouts',
    }
};

// Connection status constants
export const CONNECTION_STATUS = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    FAILED: 'failed',
};

// Notification types
export const NOTIFICATION_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
};

// Message types
export const MESSAGE_TYPES = {
    NARSESE: 'narsese',
    NATURAL_LANGUAGE: 'natural_language',
    AGENT_CONTROL: 'agentControl',
    KNOWLEDGE_GRAPH_UPDATE: 'knowledge_graph_update',
    KNOWLEDGE_GRAPH_ERROR: 'knowledge_graph_error',
    SYSTEM_STATS: 'system_stats',
    REASONING_TRACE: 'reasoning_trace',
    CONNECTION_STATS: 'connection_stats',
    MESSAGE_TIMEOUT: 'message_timeout',
    PARSE_ERROR: 'parse_error',
    SEND_ERROR: 'send_error',
    ERROR: 'error',
    STATUS: 'status',
    MESSAGE: 'message',
    SEARCH: 'search',
    SEARCH_RESULTS: 'search_results',
    SEARCH_ERROR: 'search_error',
    TASK_UPDATE: 'task_update',
    TASK_ERROR: 'task_error',
};