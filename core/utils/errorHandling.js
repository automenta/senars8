/**
 * Comprehensive error handling utilities for SeNARS
 * Provides consistent error handling across Core, Agent, and UI modules
 */

// Error types classification
export const ERROR_TYPES = {
  SYSTEM: 'SYSTEM_ERROR',
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  INTEGRATION: 'INTEGRATION_ERROR',
  BUSINESS: 'BUSINESS_ERROR',
  USER_INPUT: 'USER_INPUT_ERROR'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',      // Non-critical issues
  MEDIUM: 'medium', // Affects functionality but doesn't break system
  HIGH: 'high',    // System impacted, user affected
  CRITICAL: 'critical' // System failure requiring immediate attention
};

// Base error class for the system
export class SeNARSError extends Error {
  constructor(message, type = ERROR_TYPES.SYSTEM, severity = ERROR_SEVERITY.HIGH, originalError = null) {
    super(message);
    this.name = 'SeNARSError';
    this.type = type;
    this.severity = severity;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
    this.stack = originalError?.stack || this.stack; // Preserve original stack if available
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      timestamp: this.timestamp,
      stack: this.severity === ERROR_SEVERITY.CRITICAL ? this.stack : undefined
    };
  }
}

// Network-related errors
export class NetworkError extends SeNARSError {
  constructor(message, code = null) {
    super(message, ERROR_TYPES.NETWORK, ERROR_SEVERITY.HIGH);
    this.name = 'NetworkError';
    this.code = code;
  }
}

// Validation errors
export class ValidationError extends SeNARSError {
  constructor(message, field = null, value = null) {
    super(message, ERROR_TYPES.VALIDATION, ERROR_SEVERITY.MEDIUM);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

// Integration errors for Core-UI communication
export class IntegrationError extends SeNARSError {
  constructor(message, component = null) {
    super(message, ERROR_TYPES.INTEGRATION, ERROR_SEVERITY.HIGH);
    this.name = 'IntegrationError';
    this.component = component;
  }
}

/**
 * Promise error handler with retry logic
 */
export class PromiseErrorHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.retryableErrors = options.retryableErrors || [
      'NetworkError', 'ECONNREFUSED', 'ETIMEDOUT'
    ];
  }

  async withRetry(asyncOperation, context = '') {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await asyncOperation();
      } catch (error) {
        lastError = error;
        
        if (attempt === this.maxRetries) {
          break;
        }
        
        if (!this.shouldRetry(error)) {
          throw error;
        }
        
        const delay = this.retryDelay * Math.pow(this.backoffMultiplier, attempt);
        await this.sleep(delay);
      }
    }
    
    throw new SeNARSError(
      `Operation failed after ${this.maxRetries + 1} attempts: ${context}`,
      ERROR_TYPES.SYSTEM,
      ERROR_SEVERITY.HIGH,
      lastError
    );
  }

  shouldRetry(error) {
    if (error.type === ERROR_TYPES.NETWORK) return true;
    
    const errorMessage = error.message || error.toString();
    return this.retryableErrors.some(retryable => 
      errorMessage.includes(retryable) || error.code === retryable
    );
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Centralized error reporting and logging
 */
export class ErrorReporter {
  constructor(config = {}) {
    this.handlers = config.handlers || [];
    this.filters = config.filters || [];
    this.samplingRate = config.samplingRate || 1.0; // 1.0 = report all errors
  }

  addHandler(handler) {
    this.handlers.push(handler);
  }

  addFilter(filter) {
    this.filters.push(filter);
  }

  shouldReport(error) {
    // Apply sampling
    if (Math.random() > this.samplingRate) {
      return false;
    }
    
    // Apply filters
    return !this.filters.some(filter => filter(error));
  }

  async report(error, context = {}) {
    if (!this.shouldReport(error)) {
      return;
    }

    const enrichedError = {
      ...error,
      context,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      timestamp: new Date().toISOString()
    };

    // Execute all handlers
    const results = await Promise.allSettled(
      this.handlers.map(handler => handler(enrichedError))
    );

    // Log any handler failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Error handler ${index} failed:`, result.reason);
      }
    });
  }
}

// Global error reporter instance
export const globalErrorReporter = new ErrorReporter();

// Error handling middleware for Express (if needed)
export const errorHandlerMiddleware = (err, req, res, next) => {
  const senarsError = err instanceof SeNARSError ? err : 
    new SeNARSError(err.message, ERROR_TYPES.SYSTEM, ERROR_SEVERITY.HIGH, err);
  
  console.error('Unhandled error:', senarsError);
  
  globalErrorReporter.report(senarsError, {
    url: req.url,
    method: req.method,
    headers: req.headers
  }).catch(console.error);
  
  const statusCode = senarsError.severity === ERROR_SEVERITY.CRITICAL ? 500 : 400;
  res.status(statusCode).json({
    error: senarsError.message,
    type: senarsError.type,
    timestamp: senarsError.timestamp
  });
};

// Export utility functions
export const createErrorHandler = (context) => {
  return (error, additionalContext = {}) => {
    const senarsError = error instanceof SeNARSError ? error : 
      new SeNARSError(
        error.message || 'Unknown error occurred',
        ERROR_TYPES.SYSTEM,
        ERROR_SEVERITY.MEDIUM,
        error
      );
    
    console.error(`Error in ${context}:`, senarsError);
    globalErrorReporter.report(senarsError, {...additionalContext, context}).catch(console.error);
    
    return senarsError;
  };
};

export default {
  SeNARSError,
  NetworkError,
  ValidationError,
  IntegrationError,
  PromiseErrorHandler,
  ErrorReporter,
  globalErrorReporter,
  errorHandlerMiddleware,
  createErrorHandler,
  ERROR_TYPES,
  ERROR_SEVERITY
};