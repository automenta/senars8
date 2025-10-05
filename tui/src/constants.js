// Shared constants for TUI application
// Consolidates all magic numbers and configuration values

export const TUI_CONSTANTS = {
    // Timing configurations
    TIMEOUTS: {
        STARTUP: 30000,
        SIGNAL_TEST: 1000,
        CLEANUP_DELAY: 5000,
        CONNECTION_RETRY: 2000,
        MESSAGE_PROCESSING: 500,
        CONDITION_CHECK: 100,
        TEST_CONDITION: 5000,
        TUI_RUN: 10000,
        INTEGRATION_TEST: 30000,
        GRACEFUL_SHUTDOWN: 500,
        SETUP: 1500,
    },

    // Exit codes
    EXIT_CODES: {
        SUCCESS: 0,
        ERROR: 1,
        TIMEOUT: 124,
    },

    // Port configurations
    PORTS: {
        START: 8085,
        MAX_RETRIES: 20,
        TEST_AGENT: 8085,
        MOCK_SERVERS: {
            DISCOVERY: 8086,
            SERVICE: 8087,
            ERROR_HANDLING: 8088,
            MESSAGE_FLOW: 8089,
        },
        COMMON_SCAN: [8080, 8081, 8082, 8083],
        // Use common agent port as fallback
        DEFAULT_AGENT: 8080,
    },

    // UI Layout defaults
    LAYOUT: {
        SIDEBAR_WIDTH: 35,
        SIDEBAR_WIDTH_LARGE: 45,
        PANEL_HEIGHT: 12,
        MAX_HEIGHT: 30,
        MIN_ITEM_WIDTH: 30,
        DEFAULT_SPLIT: 50,
        MIN_SIZE: 20,
    },

    // Input handling
    INPUT: {
        CTRL_C: 3,
        QUIT_COMMANDS: ['quit', 'exit'],
    },

    // Logging levels
    LOG_LEVELS: {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3,
    },

    // Component variants
    VARIANTS: {
        DEFAULT: 'default',
        PRIMARY: 'primary',
        SUCCESS: 'success',
        WARNING: 'warning',
        ERROR: 'error',
        INFO: 'info',
    },

    // Connection modes
    CONNECTION_MODES: {
        EMBEDDED: 'embedded',
        WEBSOCKET: 'websocket',
    },

    // Test retry intervals
    RETRY_INTERVALS: {
        FAST: 100,
        MEDIUM: 500,
        SLOW: 1000,
    },

    // File paths and extensions
    PATHS: {
        CAPTURES_DIR: 'captures',
        CONFIG_FILE: 'config.json',
        LOG_FILE: 'tui.log',
    },

    // UI Messages
    MESSAGES: {
        STARTING: '🚀 Starting SeNARS TUI...',
        STARTED: '✅ TUI started successfully',
        SHUTTING_DOWN: '🛑 Shutting down TUI...',
        SHUTDOWN_COMPLETE: '✅ TUI shutdown complete',
        LIMITED_INPUT: '⚠️  Limited input mode - raw mode not supported',
        PRESS_CTRL_C: '💡 Press Ctrl+C to exit',
        TYPE_QUIT: '💡 Type "quit" or "exit" to stop',
        STARTUP_TIMEOUT: '⏰ Startup timeout reached',
        SIGNAL_TEST: '🔍 Active SIGINT listeners:',
    },

    // Error patterns to ignore in tests
    IGNORABLE_ERRORS: [
        'defaultProps will be removed',
        'Warning:',
        'DeprecationWarning:',
        'timeout',
        'SIGTERM',
        'ETIMEDOUT',
    ],

    // Fatal error patterns
    FATAL_ERRORS: [
        'Error: ',
        'FATAL',
        'UnhandledPromiseRejection',
        'ReferenceError',
        'TypeError',
    ],
};

// Helper functions for constants
export const getTimeout = (key) => TUI_CONSTANTS.TIMEOUTS[key];
export const getPort = (key) => TUI_CONSTANTS.PORTS[key];
export const getLayout = (key) => TUI_CONSTANTS.LAYOUT[key];
export const getMessage = (key) => TUI_CONSTANTS.MESSAGES[key];
export const isIgnorableError = (error) =>
    TUI_CONSTANTS.IGNORABLE_ERRORS.some(pattern => error.includes(pattern));
export const isFatalError = (error) =>
    TUI_CONSTANTS.FATAL_ERRORS.some(pattern => error.includes(pattern));

// Export default for convenience
export default TUI_CONSTANTS;