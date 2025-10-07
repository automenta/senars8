/**
 * Shuts down the application gracefully.
 * @param {string} signal - The signal received.
 * @param {object} logger - The logger instance.
 * @param {Function} cleanup - The cleanup function to call before exiting.
 */
export async function gracefulShutdown(signal, logger, cleanup) {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await cleanup();
    process.exit(0);
}

/**
 * Sets up graceful shutdown handlers for SIGINT and SIGTERM signals.
 * @param {object} logger - The logger instance.
 * @param {Function} cleanup - The cleanup function to call before exiting.
 */
export function setupGracefulShutdown(logger, cleanup) {
    const shutdownHandler = async (signal) => {
        await gracefulShutdown(signal, logger, cleanup);
    };

    process.on('SIGINT', () => shutdownHandler('SIGINT'));
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
}

/**
 * Handles uncaught errors, logs them, and shuts down the application.
 * @param {Error} error - The uncaught error.
 * @param {object} logger - The logger instance.
 * @param {Function} cleanup - The cleanup function to call before exiting.
 */
export async function handleUncaughtError(error, logger, cleanup) {
    logger.error('Unhandled error:', error);
    await cleanup();
    process.exit(1);
}

/**
 * Sets up uncaught exception and rejection handlers.
 * @param {object} logger - The logger instance.
 * @param {Function} cleanup - The cleanup function to call before exiting.
 */
export function setupUncaughtErrorHandlers(logger, cleanup) {
    process.on('uncaughtException', (error) => {
        handleUncaughtError(error, logger, cleanup);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        handleUncaughtError(reason instanceof Error ? reason : new Error(String(reason)), logger, cleanup);
    });
}