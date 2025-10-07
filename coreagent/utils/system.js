import logger from './logger.js';

const log = logger.create('system');

/**
 * Handles uncaught errors and exceptions
 */
export const handleUncaughtError = (error, log, cleanupCallback) => {
    log.error('Uncaught error:', error);

    if (cleanupCallback && typeof cleanupCallback === 'function') {
        try {
            cleanupCallback();
        } catch (cleanupError) {
            log.error('Error during cleanup:', cleanupError);
        }
    }

    if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
    } else {
        throw error;
    }
};

/**
 * Sets up graceful shutdown handlers for the application
 */
export const setupGracefulShutdown = (log, shutdownCallback) => {
    const shutdown = async (signal) => {
        log.info(`Received ${signal}, shutting down gracefully...`);

        if (shutdownCallback && typeof shutdownCallback === 'function') {
            try {
                await shutdownCallback();
            } catch (error) {
                log.error('Error during shutdown:', error);
            }
        }

        if (process.env.NODE_ENV !== 'test') {
            process.exit(0);
        }
    };

    // Handle different termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon restarts

    // Handle uncaught exceptions and unhandled promise rejections
    process.on('uncaughtException', (error) => {
        handleUncaughtError(error, log, shutdownCallback);
    });

    process.on('unhandledRejection', (reason, promise) => {
        log.error('Unhandled promise rejection at:', promise, 'reason:', reason);
        handleUncaughtError(new Error(`Unhandled promise rejection: ${reason}`), log, shutdownCallback);
    });
};

/**
 * Checks if the current process is the main module
 */
export const isMainModule = (metaUrl) => {
    try {
        return import.meta.url === metaUrl;
    } catch {
        return require.main === module;
    }
};

/**
 * Gets memory usage information
 */
export const getMemoryUsage = () => {
    const usage = process.memoryUsage();
    return {
        rss: Math.round(usage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
        external: Math.round(usage.external / 1024 / 1024), // MB
    };
};

/**
 * Gets system information
 */
export const getSystemInfo = () => {
    return {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        pid: process.pid,
        uptime: process.uptime(),
        memory: getMemoryUsage(),
        env: process.env.NODE_ENV || 'development',
    };
};