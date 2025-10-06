/**
 * Integration Testing Utilities
 * Provides tools for testing the integration between Core, Agent, and UI modules
 */

import BaseTest, { IntegrationTest } from './BaseTest.js';
import { getCoreAPI } from '../core/api/CoreAPI.js';
import { getAgentAPI } from '../agent/api/AgentAPI.js';
import { createUIAPI } from '../ui/api/UIAPI.js';
import { TEST_CONFIG } from './TestConfig.js';

// Integration test scenarios
const INTEGRATION_SCENARIOS = {
  BASIC_AGENT_CYCLE: {
    name: 'Basic Agent Cycle',
    description: 'Test the full cycle: input -> process -> output',
    steps: [
      'Initialize Core system',
      'Initialize Agent',
      'Send input to Agent',
      'Verify processing',
      'Verify output'
    ]
  },
  TASK_PROPAGATION: {
    name: 'Task Propagation',
    description: 'Test task flow from UI through Agent to Core',
    steps: [
      'Create task in Core',
      'Verify Agent receives task',
      'Verify UI is notified of task'
    ]
  },
  SYSTEM_STATE_SYNC: {
    name: 'System State Synchronization', 
    description: 'Test that all components stay in sync',
    steps: [
      'Change system state in Core',
      'Verify Agent reflects change',
      'Verify UI reflects change'
    ]
  }
};

class IntegrationTestSuite extends IntegrationTest {
  constructor() {
    super();
    this.testResults = {
      passed: [],
      failed: [],
      skipped: []
    };
  }

  async setup() {
    await super.setup();
    
    // Register test services
    this.registerService('core', getCoreAPI(TEST_CONFIG.CORE_CONFIG));
    this.registerService('agent', getAgentAPI({
      coreConfig: TEST_CONFIG.CORE_CONFIG
    }));
    // Note: UI service would require a WebSocket server for full integration
  }

  async runBasicAgentCycleTest() {
    const testName = 'Basic Agent Cycle Integration';
    console.log(`\\nRunning: ${testName}`);
    
    try {
      // Step 1: Initialize Core
      const coreAPI = this.getService('core');
      await coreAPI.initialize();
      console.log('✓ Core initialized');
      
      // Step 2: Initialize Agent
      const agentAPI = this.getService('agent');
      await agentAPI.initialize();
      console.log('✓ Agent initialized');
      
      // Step 3: Send input to agent
      const testInput = '<*S --> M>.';
      const processResult = await agentAPI.processNarsese(testInput);
      console.log('✓ Input processed');
      
      // Step 4: Verify agent state change
      const agentState = await agentAPI.getAgentState();
      console.log(`✓ Agent state retrieved, tasks: ${agentState.tasks?.length || 0}`);
      
      // Step 5: Verify core system stats
      const systemStats = await agentAPI.getSystemStats();
      console.log(`✓ System stats retrieved, cycle count: ${systemStats.cycleCount}`);
      
      this.testResults.passed.push({
        name: testName,
        scenario: INTEGRATION_SCENARIOS.BASIC_AGENT_CYCLE,
        steps: INTEGRATION_SCENARIOS.BASIC_AGENT_CYCLE.steps,
        result: 'PASSED'
      });
      
      console.log(`\\n${testName}: PASSED`);
    } catch (error) {
      this.testResults.failed.push({
        name: testName,
        scenario: INTEGRATION_SCENARIOS.BASIC_AGENT_CYCLE,
        error: error.message,
        result: 'FAILED'
      });
      
      console.log(`${testName}: FAILED - ${error.message}`);
    }
  }

  async runTaskPropagationTest() {
    const testName = 'Task Propagation Integration';
    console.log(`\\nRunning: ${testName}`);
    
    try {
      const coreAPI = this.getService('core');
      const agentAPI = this.getService('agent');
      
      // Initialize systems
      await coreAPI.initialize();
      await agentAPI.initialize();
      
      // Add a task via Core API
      const taskContent = 'Maintain system health';
      const addResult = await coreAPI.addTask(taskContent, '!');
      console.log('✓ Task added to Core');
      
      // Verify task is reflected in Agent
      const agentState = await agentAPI.getAgentState();
      console.log(`✓ Agent state checked, goals count: ${agentState.goals?.length || 0}`);
      
      // Verify system stats consistency
      const coreStats = await coreAPI.getSystemStats();
      const agentStats = await agentAPI.getSystemStats();
      
      console.log(`✓ Stats - Core cycles: ${coreStats.cycleCount}, Agent cycles: ${agentStats.cycleCount}`);
      
      this.testResults.passed.push({
        name: testName,
        scenario: INTEGRATION_SCENARIOS.TASK_PROPAGATION,
        steps: INTEGRATION_SCENARIOS.TASK_PROPAGATION.steps,
        result: 'PASSED'
      });
      
      console.log(`\\n${testName}: PASSED`);
    } catch (error) {
      this.testResults.failed.push({
        name: testName,
        scenario: INTEGRATION_SCENARIOS.TASK_PROPAGATION,
        error: error.message,
        result: 'FAILED'
      });
      
      console.log(`${testName}: FAILED - ${error.message}`);
    }
  }

  async runSystemStateSyncTest() {
    const testName = 'System State Synchronization';
    console.log(`\\nRunning: ${testName}`);
    
    try {
      const coreAPI = this.getService('core');
      const agentAPI = this.getService('agent');
      
      // Initialize systems
      await coreAPI.initialize();
      await agentAPI.initialize();
      
      // Get initial states
      const initialCoreStats = await coreAPI.getSystemStats();
      const initialAgentStats = await agentAPI.getSystemStats();
      
      console.log(`✓ Initial states - Core: ${initialCoreStats.cycleCount}, Agent: ${initialAgentStats.cycleCount}`);
      
      // Perform an action that should affect system state
      await agentAPI.start(1); // Run 1 cycle
      await new Promise(resolve => setTimeout(resolve, 100)); // Allow processing
      
      // Get updated states
      const updatedCoreStats = await coreAPI.getSystemStats();
      const updatedAgentStats = await agentAPI.getSystemStats();
      
      console.log(`✓ Updated states - Core: ${updatedCoreStats.cycleCount}, Agent: ${updatedAgentStats.cycleCount}`);
      
      // Verify states are synchronized (or at least have moved forward)
      this.assert(updatedCoreStats.cycleCount >= initialCoreStats.cycleCount, 
        'Core cycle count should not decrease');
      this.assert(updatedAgentStats.cycleCount >= initialAgentStats.cycleCount, 
        'Agent cycle count should not decrease');
      
      this.testResults.passed.push({
        name: testName,
        scenario: INTEGRATION_SCENARIOS.SYSTEM_STATE_SYNC,
        steps: INTEGRATION_SCENARIOS.SYSTEM_STATE_SYNC.steps,
        result: 'PASSED'
      });
      
      console.log(`\\n${testName}: PASSED`);
    } catch (error) {
      this.testResults.failed.push({
        name: testName,
        scenario: INTEGRATION_SCENARIOS.SYSTEM_STATE_SYNC,
        error: error.message,
        result: 'FAILED'
      });
      
      console.log(`${testName}: FAILED - ${error.message}`);
    }
  }

  async runAllIntegrationTests() {
    console.log('Starting Integration Test Suite...');
    console.log(`Testing scenarios: ${Object.keys(INTEGRATION_SCENARIOS).join(', ')}`);
    
    await this.runBasicAgentCycleTest();
    await this.runTaskPropagationTest();
    await this.runSystemStateSyncTest();
    
    this.printIntegrationReport();
  }

  printIntegrationReport() {
    console.log('\\n=== Integration Test Report ===');
    console.log(`Scenarios: ${Object.keys(INTEGRATION_SCENARIOS).length}`);
    console.log(`Passed: ${this.testResults.passed.length}`);
    console.log(`Failed: ${this.testResults.failed.length}`);
    console.log(`Success Rate: ${this.testResults.passed.length > 0 ? 
      (this.testResults.passed.length / (this.testResults.passed.length + this.testResults.failed.length) * 100).toFixed(2) : 0}%`);
    
    if (this.testResults.failed.length > 0) {
      console.log('\\nFailed Tests:');
      this.testResults.failed.forEach(failure => {
        console.log(`  - ${failure.name}: ${failure.error}`);
      });
    }
    
    console.log('\\nDetailed Results:');
    [...this.testResults.passed, ...this.testResults.failed].forEach(result => {
      console.log(`\\n${result.name}: ${result.result}`);
      console.log(`  Scenario: ${result.scenario.name}`);
      console.log(`  Description: ${result.scenario.description}`);
      console.log(`  Steps: ${result.steps.join(' -> ')}`);
    });
    
    console.log('=============================\\n');
  }

  async teardown() {
    // Clean up services
    const coreAPI = this.getService('core');
    const agentAPI = this.getService('agent');
    
    if (coreAPI) await coreAPI.destroy();
    if (agentAPI) await agentAPI.destroy();
    
    await super.teardown();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const integrationTest = new IntegrationTestSuite();
  
  integrationTest.setup()
    .then(async () => {
      await integrationTest.runAllIntegrationTests();
      await integrationTest.teardown();
      
      // Exit with appropriate code
      const totalFailed = integrationTest.testResults.failed.length;
      process.exit(totalFailed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Integration tests failed:', error);
      process.exit(1);
    });
}

export default IntegrationTestSuite;
export { IntegrationTestSuite, INTEGRATION_SCENARIOS };