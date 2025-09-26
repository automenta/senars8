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
    },

    // Validation constants
    VALIDATION: {
        MAX_INPUT_LENGTH: 1000,
        MAX_TERM_LENGTH: 500,
    },
};