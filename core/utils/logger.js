// Unified logger that uses the common service logger to ensure consistency
import commonLogger from '../../common/services/Logger.js';

// Export the functions from the common logger for backward compatibility
export const error = commonLogger.error.bind(commonLogger);
export const info = commonLogger.info.bind(commonLogger);
export const warn = commonLogger.warn.bind(commonLogger);
export const debug = commonLogger.debug.bind(commonLogger);

// Define LOG_LEVELS for compatibility
export const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
};
