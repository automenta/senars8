/**
 * Shared configuration constants for the project.
 */
export const CONFIG = {
    // Connection related constants
    CONNECTION: {
        RECONNECT_DELAY: 3000,
        MAX_RECONNECT_ATTEMPTS: 10,
        MESSAGE_TIMEOUT: 15000,
        PENDING_MESSAGE_MAX_SIZE: 64 * 1024, // 64KB
        WEBSOCKET_URL: 'ws://localhost:8080',
        CRDT_WEBSOCKET_URL: 'ws://localhost:8080/crdt',
    },

    // Validation constants
    VALIDATION: {
        MAX_INPUT_LENGTH: 1000,
        MAX_TERM_LENGTH: 500,
    },

    // UI/TUI specific constants
    UI: {
        MAX_MESSAGE_HISTORY: 50,
        MAX_NOTIFICATIONS: 100,
        DEFAULT_NOTIFICATION_DURATION: 5000,
        MAX_NOTIFICATION_HISTORY: 30,
        LAYOUT: {
            DEFAULT_PRESET_NAME: 'default',
            LAYOUT_STORAGE_KEY: 'senars-ide-layout',
            PRESET_LAYOUTS_STORAGE_KEY: 'senars-ide-preset-layouts',
        },
    },

    // TUI specific constants
    TUI: {
        UPDATE_INTERVAL: 1000,
        ENABLE_COLOR: true,
        ENABLE_LOGGING: true,
    },

    // Agent specific constants
    AGENT: {
        WEBSOCKET_URL: 'ws://localhost:8080',
        DEFAULT_PORT: 8080,
        MAX_CONNECTIONS: 100,
        CYCLE_DELAY_MS: 50,
        FOCUS_SET_SIZE: 20,
        META_TASK_PRIORITY: 0.9,
        ACTIONABLE_GOAL_PRIORITY_THRESHOLD: 0.1,
        MAX_GOALS_TO_EXECUTE: 3,
        RECENCY_DECAY_FACTOR: 10000,
        SIMILARITY_OFFSET: 0.1,
    },
};