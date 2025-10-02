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