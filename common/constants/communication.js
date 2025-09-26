/**
 * Shared constants for agent communication.
 */

// Connection status constants
export const CONNECTION_STATUS = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    FAILED: 'failed',
};

// Message types for agent communication
export const MESSAGE_TYPES = {
    NARSESE: 'narsese',
    NATURAL_LANGUAGE: 'natural_language',
    AGENT_CONTROL: 'agentControl',
    KNOWLEDGE_GRAPH_UPDATE: 'knowledge_graph_update',
    KNOWLEDGE_GRAPH_ERROR: 'knowledge_graph_error',
    SYSTEM_STATS: 'system_stats',
    REASONING_TRACE: 'reasoning_trace',
    CONNECTION_STATS: 'connection_stats',
    AGENT_STATE_UPDATE: 'agentStateUpdate',
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

// Notification types
export const NOTIFICATION_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
};