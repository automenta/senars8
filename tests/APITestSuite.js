/**
 * API Testing Suite
 * Comprehensive tests for Core, Agent, and UI API layers
 */

import BaseTest, { APITest } from '../tests/BaseTest.js';
import CoreAPI, { getCoreAPI } from '../core/api/CoreAPI.js';
import AgentAPI, { getAgentAPI } from '../agent/api/AgentAPI.js';
import UIAPI, { createUIAPI } from '../ui/api/UIAPI.js';
import { TEST_CONFIG } from '../tests/TestConfig.js';

// Test configuration for API tests
const API_TEST_CONFIG = {
  ...TEST_CONFIG,
  CORE_CONFIG: {
    // Configuration for core API tests
    debug: true,
    performance: false
  },
  MOCK_WS_URL: 'ws://localhost:4081' // Use test port
};

// Core API Tests
class CoreAPITest extends APITest {
  constructor() {
    super(null); // Will set API in setup
    this.api = null;
  }

  async setup() {
    await super.setup();
    this.api = getCoreAPI(API_TEST_CONFIG.CORE_CONFIG);
  }

  async runAllTests() {
    console.log('Running Core API Tests...');
    
    await this.runTest('Initialize Core API', async () => {
      const result = await this.api.initialize();
      this.assert(result.success, 'Core API should initialize successfully');
    });
    
    await this.runTest('Start Core System', async () => {
      const result = await this.api.start();
      this.assert(result.success, 'Core system should start successfully');
    });
    
    await this.runTest('Add Task to Core', async () => {
      const result = await this.api.addTask('<*S --> M>.');
      this.assert(result.success, 'Task should be added successfully');
    });
    
    await this.runTest('Get System Stats', async () => {
      const result = await this.api.getSystemStats();
      this.assert(result !== null, 'System stats should be retrievable');
    });
    
    await this.runTest('Stop Core System', async () => {
      const result = await this.api.stop();
      this.assert(result.success, 'Core system should stop successfully');
    });
    
    await this.runTest('Reset Core System', async () => {
      const result = await this.api.reset();
      this.assert(result.success, 'Core system should reset successfully');
    });
    
    await this.runTest('Process Narsese', async () => {
      const result = await this.api.processNarsese('<*S --> M>.');
      this.assert(result.success, 'Narsese should be processed successfully');
    });
    
    await this.runTest('Process Natural Language', async () => {
      const result = await this.api.processNaturalLanguage('Hello world');
      this.assert(result.success, 'Natural language should be processed successfully');
    });
  }

  async teardown() {
    if (this.api) {
      await this.api.destroy();
    }
    await super.teardown();
  }
}

// Agent API Tests
class AgentAPITest extends APITest {
  constructor() {
    super(null); // Will set API in setup
    this.api = null;
  }

  async setup() {
    await super.setup();
    this.api = getAgentAPI({
      coreConfig: API_TEST_CONFIG.CORE_CONFIG
    });
  }

  async runAllTests() {
    console.log('Running Agent API Tests...');
    
    await this.runTest('Initialize Agent API', async () => {
      const result = await this.api.initialize();
      this.assert(result.success, 'Agent API should initialize successfully');
    });
    
    await this.runTest('Start Agent', async () => {
      const result = await this.api.start();
      this.assert(result.success, 'Agent should start successfully');
    });
    
    await this.runTest('Add Task to Agent', async () => {
      const result = await this.api.addTask('Test task content');
      this.assert(result.success, 'Task should be added to agent successfully');
    });
    
    await this.runTest('Get Agent State', async () => {
      const result = await this.api.getAgentState();
      this.assert(result !== null, 'Agent state should be retrievable');
    });
    
    await this.runTest('Get System Stats via Agent', async () => {
      const result = await this.api.getSystemStats();
      this.assert(result !== null, 'System stats should be retrievable via agent');
    });
    
    await this.runTest('Process Narsese via Agent', async () => {
      const result = await this.api.processNarsese('<*S --> M>.');
      this.assert(result.success, 'Narsese should be processed via agent successfully');
    });
    
    await this.runTest('Process Natural Language via Agent', async () => {
      const result = await this.api.processNaturalLanguage('Test input');
      this.assert(result.success, 'Natural language should be processed via agent successfully');
    });
    
    await this.runTest('Create Plan via Agent', async () => {
      const result = await this.api.createPlan('Maintain health');
      // Plan might be null if no solution is found, but should not error
      this.assert(result !== undefined, 'Plan creation should not throw error');
    });
  }

  async teardown() {
    if (this.api) {
      await this.api.destroy();
    }
    await super.teardown();
  }
}

// UI API Tests (Mock-based since real WebSocket tests require server)
class UIAPITest extends APITest {
  constructor() {
    super(null); // Will set API in setup
    this.api = null;
  }

  async setup() {
    await super.setup();
    // For testing purposes, we'll use a mock WebSocket URL
    // In real tests, this would connect to a test server
    this.api = createUIAPI(API_TEST_CONFIG.MOCK_WS_URL);
  }

  async runAllTests() {
    console.log('Running UI API Tests...');
    
    // Since UI API requires a running WebSocket server, we'll test the structure
    // and mock the communication layer for now
    
    await this.runTest('Initialize UI API', async () => {
      // API is initialized in setup, so just verify it's created
      this.assertTruthy(this.api, 'UI API instance should be created');
    });
    
    await this.runTest('Check Connection Status', async () => {
      // Should not throw error
      const status = this.api.getConnectionStatus();
      this.assert(status !== null, 'Connection status should be accessible');
    });
    
    await this.runTest('Verify API Methods Exist', async () => {
      this.assert(typeof this.api.startAgent === 'function', 'startAgent method should exist');
      this.assert(typeof this.api.stopAgent === 'function', 'stopAgent method should exist');
      this.assert(typeof this.api.getSystemStats === 'function', 'getSystemStats method should exist');
      this.assert(typeof this.api.sendNarsese === 'function', 'sendNarsese method should exist');
    });
  }

  async teardown() {
    if (this.api) {
      this.api.destroy();
    }
    await super.teardown();
  }
}

// Main test suite runner
class APITestSuite extends BaseTest {
  constructor() {
    super();
    this.coreTest = new CoreAPITest();
    this.agentTest = new AgentAPITest();
    this.uiTest = new UIAPITest();
  }

  async runAllTests() {
    console.log('Starting API Test Suite...');
    
    await this.coreTest.runAllTests();
    await this.agentTest.runAllTests();
    await this.uiTest.runAllTests();
    
    // Combine results
    this.testResults = [
      ...this.coreTest.testResults,
      ...this.agentTest.testResults,
      ...this.uiTest.testResults
    ];
    
    this.errors = [
      ...this.coreTest.errors,
      ...this.agentTest.errors,
      ...this.uiTest.errors
    ];
  }

  printDetailedReport() {
    console.log('\\n=== Detailed API Test Report ===');
    
    console.log('\\nCore API Tests:');
    this.coreTest.printReport();
    
    console.log('Agent API Tests:');
    this.agentTest.printReport();
    
    console.log('UI API Tests:');
    this.uiTest.printReport();
    
    console.log('=== Overall API Test Report ===');
    this.printReport();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new APITestSuite();
  
  testSuite.setup()
    .then(async () => {
      await testSuite.runAllTests();
      testSuite.printDetailedReport();
      
      const stats = testSuite.getStats();
      process.exit(stats.failedTests > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export {
  CoreAPITest,
  AgentAPITest, 
  UIAPITest,
  APITestSuite
};

export default APITestSuite;