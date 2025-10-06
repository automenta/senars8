// Enhanced Error Handling for UI Components
import {EventBus} from '@common/utils/eventBus.js';
import log from '@core/utils/logger.js';
import notificationService from '@/services/notificationService';

class UIErrorHandler extends EventBus {
    constructor() {
        super();
        this.errorCount = 0;
        this.warningCount = 0;
        this.maxErrors = 100; // Prevent infinite error loops
        this.errorBuffer = []; // Buffer for error aggregation
        this.errorBufferTimeout = null;
        this.bufferTime = 1000; // 1 second buffer window
    }

    /**
     * Enhanced error handling with detailed context
     * @param {Error|string} error - The error object or message
     * @param {Object} context - Additional context about where the error occurred
     * @param {string} operation - Name of the operation that failed
     */
    handle(error, context = {}, operation = 'unknown') {
        try {
            this.errorCount++;

            // Create a structured error object
            const errorObj = {
                id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                operation,
                error: error instanceof Error ? error : new Error(error),
                context,
                stack: error instanceof Error ? error.stack : new Error().stack
            };

            // Log to console
            log.error(`${operation} failed:`, errorObj.error.message, context);

            // Add to notification service for user feedback
            const userMessage = this.formatUserMessage(errorObj);
            notificationService.addError(
                `Error in ${operation.charAt(0).toUpperCase() + operation.slice(1)}`,
                userMessage,
                10000 // Show error for 10 seconds
            );

            // Emit the error event for any listeners
            this.emit('error', errorObj);

            // Buffer errors for potential aggregation
            this.bufferError(errorObj);

            // Return error object for caller to handle further
            return errorObj;
        } catch (bufferError) {
            // If error handling itself fails, log but don't throw
            console.error('Error in error handler:', bufferError);
            return {error: bufferError};
        }
    }

    /**
     * Handle warnings with detailed context
     */
    handleWarning(message, context = {}, operation = 'unknown') {
        try {
            this.warningCount++;

            const warningObj = {
                id: `warning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                operation,
                message: typeof message === 'string' ? message : message.toString(),
                context
            };

            log.warn(`${operation} warning:`, message, context);

            const userMessage = this.formatUserMessage(warningObj, 'warning');
            notificationService.addWarning(
                `Warning in ${operation.charAt(0).toUpperCase() + operation.slice(1)}`,
                userMessage
            );

            this.emit('warning', warningObj);

            return warningObj;
        } catch (error) {
            console.error('Error in warning handler:', error);
            return {error};
        }
    }

    /**
     * Safe execution wrapper that handles errors automatically
     */
    async safeExecute(fn, operation = 'unknown', context = {}) {
        try {
            return await fn();
        } catch (error) {
            this.handle(error, context, operation);
            return null; // Return null to indicate failure
        }
    }

    /**
     * Safe sync execution wrapper
     */
    safeExecuteSync(fn, operation = 'unknown', context = {}) {
        try {
            return fn();
        } catch (error) {
            this.handle(error, context, operation);
            return null;
        }
    }

    /**
     * Format error message for user display
     */
    formatUserMessage(errorObj, type = 'error') {
        let message = '';

        if (errorObj.error && errorObj.error.message) {
            message = errorObj.error.message;
        } else if (errorObj.message) {
            message = errorObj.message;
        } else {
            message = 'An unexpected error occurred';
        }

        // Clean up technical details for user display
        if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
            return 'Network connection error. Please check your connection to the agent.';
        }

        if (message.includes('WebSocket')) {
            return 'WebSocket connection error. Agent may be unreachable.';
        }

        if (message.includes('timeout')) {
            return 'Operation timed out. Please try again.';
        }

        // Provide helpful context based on operation type
        switch (errorObj.operation) {
            case 'sendMessage':
                return `Failed to send message to agent: ${message}`;
            case 'fetchTasks':
                return `Failed to fetch tasks from agent: ${message}`;
            case 'connection':
                return `Connection error: ${message}`;
            default:
                return message;
        }
    }

    /**
     * Buffer errors for potential aggregation
     */
    bufferError(errorObj) {
        this.errorBuffer.push(errorObj);

        // Clear existing timeout
        if (this.errorBufferTimeout) {
            clearTimeout(this.errorBufferTimeout);
        }

        // Set new timeout to process buffered errors
        this.errorBufferTimeout = setTimeout(() => {
            this.processBufferedErrors();
        }, this.bufferTime);
    }

    /**
     * Process and potentially aggregate buffered errors
     */
    processBufferedErrors() {
        if (this.errorBuffer.length === 0) return;

        // Group similar errors
        const groupedErrors = this.groupSimilarErrors(this.errorBuffer);

        // For now, just emit the most recent error
        const recentError = this.errorBuffer[0];

        // Reset buffer
        this.errorBuffer = [];

        // Could implement error aggregation logic here
        // For example, if many similar errors occurred, show one with count
    }

    /**
     * Group similar errors together
     */
    groupSimilarErrors(errors) {
        const grouped = {};

        errors.forEach(error => {
            // Group by error message or operation type
            const key = error.error?.message || error.operation;
            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(error);
        });

        return grouped;
    }

    /**
     * Get error statistics
     */
    getStats() {
        return {
            totalErrors: this.errorCount,
            totalWarnings: this.warningCount,
            bufferLength: this.errorBuffer.length
        };
    }

    /**
     * Reset error counters
     */
    reset() {
        this.errorCount = 0;
        this.warningCount = 0;
        this.errorBuffer = [];
        if (this.errorBufferTimeout) {
            clearTimeout(this.errorBufferTimeout);
            this.errorBufferTimeout = null;
        }
    }
}

// Create a singleton instance
const uiErrorHandler = new UIErrorHandler();

// Export hook for React components to use
const useUIErrorHandler = (componentName = 'Unknown') => {
    const safeExecute = (fn, operation = 'unknown', additionalContext = {}) => {
        return uiErrorHandler.safeExecute(fn, operation, {
            component: componentName,
            ...additionalContext
        });
    };

    const safeExecuteSync = (fn, operation = 'unknown', additionalContext = {}) => {
        return uiErrorHandler.safeExecuteSync(fn, operation, {
            component: componentName,
            ...additionalContext
        });
    };

    const handleError = (error, context = {}) => {
        return uiErrorHandler.handle(error, {
            component: componentName,
            ...context
        }, context.operation || 'operation');
    };

    const handleWarning = (message, context = {}) => {
        return uiErrorHandler.handleWarning(message, {
            component: componentName,
            ...context
        }, context.operation || 'operation');
    };

    return {
        handleError,
        handleWarning,
        safeExecute,
        safeExecuteSync,
        errorStats: uiErrorHandler.getStats()
    };
};

export default uiErrorHandler;
export {useUIErrorHandler};