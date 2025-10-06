/**
 * Comprehensive test configuration for SeNARS
 * Provides standardized configuration for all test environments
 */

// Test configuration constants
export const TEST_CONFIG = {
  // Timeout configurations
  DEFAULT_TIMEOUT: 10000,
  LONG_TIMEOUT: 30000,
  CONNECTION_TIMEOUT: 15000,
  
  // Retry configurations
  DEFAULT_RETRIES: 3,
  MAX_RETRIES: 5,
  
  // Port configurations for tests
  TEST_PORTS: {
    START: 4000,
    END: 5000,
    WEBSOCKET: 4081,
    UI: 4001
  },
  
  // Mock configurations
  MOCK_DATA: {
    SAMPLE_NARSESE: '<*S --> M>.',
    SAMPLE_TASK: {
      term: '<*S --> M>',
      punctuation: '.',
      priority: 0.9
    },
    SAMPLE_AGENT_STATE: {
      isRunning: true,
      cycleCount: 100,
      tasks: [],
      beliefs: [],
      goals: []
    }
  },
  
  // Performance thresholds
  PERFORMANCE: {
    MAX_RENDER_TIME: 500, // ms
    MAX_MESSAGE_PROCESSING_TIME: 100, // ms
    MIN_THROUGHPUT: 10 // operations per second
  }
};

// Test utility functions
export class TestUtilities {
  // Find an available port for testing
  static async findAvailablePort(startPort = TEST_CONFIG.TEST_PORTS.START) {
    const { findAvailablePort } = await import('../tests/utils/networkUtils.js');
    return await findAvailablePort(startPort);
  }

  // Generate test data
  static generateTestData(type, count = 1) {
    const data = [];
    for (let i = 0; i < count; i++) {
      switch (type) {
        case 'task':
          data.push({
            ...TEST_CONFIG.MOCK_DATA.SAMPLE_TASK,
            id: `task-${Date.now()}-${i}`,
            creationTime: new Date().toISOString()
          });
          break;
        case 'narsese':
          data.push(`${TEST_CONFIG.MOCK_DATA.SAMPLE_NARSESE.slice(0, -1)}-${i}>.`);
          break;
        default:
          data.push(`test-data-${type}-${i}`);
      }
    }
    return data;
  }

  // Wait for condition
  static async waitForCondition(conditionFn, timeout = TEST_CONFIG.DEFAULT_TIMEOUT, interval = 100) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await conditionFn()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  // Safe test wrapper with error handling
  static async safeTest(testFn, errorMessage = 'Test failed') {
    try {
      return await testFn();
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      throw error;
    }
  }
}

// Test decorators and helpers
export const testWithRetry = (testFn, retries = TEST_CONFIG.DEFAULT_RETRIES) => {
  return async function(...args) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await testFn.apply(this, args);
      } catch (error) {
        lastError = error;
        if (attempt === retries) break;
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
      }
    }
    throw lastError;
  };
};

// Performance testing utilities
export class PerformanceTester {
  static async measureFunction(fn, ...args) {
    const start = performance.now();
    const result = await fn(...args);
    const end = performance.now();
    return {
      result,
      executionTime: end - start
    };
  }

  static async measureAsyncOperation(asyncFn, ...args) {
    const start = Date.now();
    const result = await asyncFn(...args);
    const end = Date.now();
    return {
      result,
      executionTime: end - start
    };
  }

  static assertPerformance(operation, threshold, message = 'Performance threshold exceeded') {
    if (operation.executionTime > threshold) {
      throw new Error(`${message}: ${operation.executionTime}ms > ${threshold}ms`);
    }
    return true;
  }
}

export default {
  TEST_CONFIG,
  TestUtilities,
  testWithRetry,
  PerformanceTester
};