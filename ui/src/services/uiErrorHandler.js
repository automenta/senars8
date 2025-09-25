// Enhanced Error Handling for UI Components
import {EventEmitter} from 'events';
import log from '@/utils/logger';
import notificationService from '@/services/notificationService';

class UIErrorHandler extends EventEmitter {
    constructor() {
        super();
        this.errorHandlers = new Map();
        this.errorCount = 0;
        this.lastErrorTime = null;
    }

    // Register a specific error handler for a component
    registerComponent(componentName, handler) {
        this.errorHandlers.set(componentName, handler);
    }

    // Unregister an error handler
    unregisterComponent(componentName) {
        this.errorHandlers.delete(componentName);
    }

    // Handle an error with context
    handleError(error, context = {}) {
        this.errorCount++;
        this.lastErrorTime = new Date();

        // Create error object with context
        const errorObj = {
            id: `ui-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            message: error.message || String(error),
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            component: context.component || 'unknown',
            operation: context.operation || 'unknown'
        };

        // Log the error
        log.error(`UI Error in ${errorObj.component}:`, errorObj.message, errorObj);

        // Show notification if it's a user-facing error
        if (context.showNotification !== false) {
            notificationService.addError(
                context.title || 'Error', 
                context.message || errorObj.message,
                context.duration || 5000
            );
        }

        // Emit error event for any registered handlers
        this.emit('error', errorObj);

        // Call component-specific error handler if registered
        const componentHandler = this.errorHandlers.get(context.component);
        if (componentHandler) {
            try {
                componentHandler(error, context);
            } catch (handlerError) {
                log.error('Error in component error handler:', handlerError);
            }
        }

        // Return error object for potential further processing
        return errorObj;
    }

    // Safe execution wrapper with error handling
    async safeExecute(operation, context = {}) {
        try {
            return await operation();
        } catch (error) {
            return this.handleError(error, {
                ...context,
                operation: context.operation || 'safeExecute'
            });
        }
    }

    // Get error statistics
    getStats() {
        return {
            errorCount: this.errorCount,
            lastErrorTime: this.lastErrorTime,
            componentCount: this.errorHandlers.size
        };
    }

    // Clear error statistics
    clearStats() {
        this.errorCount = 0;
        this.lastErrorTime = null;
    }
}

// Create singleton instance
const uiErrorHandler = new UIErrorHandler();

// Export the handler
export default uiErrorHandler;

// Export utility functions
export { UIErrorHandler };

// Export a hook for React components
export const useUIErrorHandler = (componentName) => {
    // Register component when hook is used
    uiErrorHandler.registerComponent(componentName, (error, _context) => {
        log.warn(`Component-level error handling for ${componentName}:`, error.message);
    });

    // Cleanup on unmount
    const cleanup = () => {
        uiErrorHandler.unregisterComponent(componentName);
    };

    return {
        handleError: (error, context = {}) => 
            uiErrorHandler.handleError(error, { ...context, component: componentName }),
        safeExecute: (operation, context = {}) => 
            uiErrorHandler.safeExecute(operation, { ...context, component: componentName }),
        cleanup
    };
};