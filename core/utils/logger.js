/**
 * Logger for the core system that uses the common logger service.
 * This maintains compatibility with the original logger interface while using common services.
 */

import commonLogger from '@common/services/Logger.js';

// Maintain the same interface as before but delegate to the common logger
const log = {
    error: (message, ...args) => commonLogger.error(message, ...args),
    info: (message, ...args) => commonLogger.info(message, ...args),
    warn: (message, ...args) => commonLogger.warn(message, ...args),
    debug: (message, ...args) => commonLogger.debug(message, ...args),
    trace: (message, ...args) => commonLogger.trace(message, ...args),
    createNamespace: (namespace) => commonLogger.createNamespace(namespace),
};

export const {error, info, warn, debug} = log;
export default log;