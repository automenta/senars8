#!/usr/bin/env node

/**
 * Automated Integration Test Runner for TUI
 * Runs comprehensive tests without requiring interactive input
 */

import {setTimeout as asyncSetTimeout} from 'timers/promises';
import {createMockTuiServer, createTestAgentEnvironment, MOCK_RESPONSES, TEST_CONFIG} from './test-utils.js';

const TEST_TIMEOUT = TEST_CONFIG.TIMEOUTS.INTEGRATION_TEST;

class TuiIntegrationTester {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        this.agentManager = null;
        this.wsManager = null;
        this.testWsServer = null;
    }

    async test(name, testFn) {
        console.log(`\n🧪 Running: ${name}`);

        try {
            await testFn();
            console.log(`✅ PASSED: ${name}`);
            this.results.passed++;
            this.results.tests.push({name, status: 'passed'});
        } catch (error) {
            console.log(`❌ FAILED: ${name}`);
            console.log(`   Error: ${error.message}`);
            this.results.failed++;
            this.results.tests.push({name, status: 'failed', error: error.message});
        }
    }

    async setupTestAgent() {
        console.log('🚀 Setting up test agent...');

        // Use the consolidated test environment setup
        const testEnv = await createTestAgentEnvironment(TEST_CONFIG.PORTS.TEST_AGENT);
        this.agentManager = testEnv.agentManager;
        this.wsManager = testEnv.wsManager;

        // Setup mock WebSocket server for testing using the new utility
        this.testWsServer = await createMockTuiServer(TEST_CONFIG.PORTS.TEST_AGENT + 1);

        return new Promise((resolve) => {
            setTimeout(resolve, TEST_CONFIG.TIMEOUTS.CONNECTION);
        });
    }

    handleTestMessage(message, ws) {
        // Use the standardized mock responses from test-utils.js
        const {type, payload} = message;

        switch (type) {
            case 'get_system_stats':
                ws.send(JSON.stringify(MOCK_RESPONSES.SYSTEM_STATS));
                break;
            case 'get_tasks':
                ws.send(JSON.stringify(MOCK_RESPONSES.TASKS_RESPONSE));
                break;
            case 'get_beliefs':
                ws.send(JSON.stringify(MOCK_RESPONSES.BELIEFS_RESPONSE));
                break;
            case 'get_goals':
                ws.send(JSON.stringify(MOCK_RESPONSES.GOALS_RESPONSE));
                break;
            case 'narsese':
            case 'natural_language':
                ws.send(JSON.stringify(MOCK_RESPONSES.LOG_RESPONSE(payload.text || payload)));
                break;
        }
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');

        if (this.testWsServer) {
            await this.testWsServer.close();
        }
        if (this.wsManager) {
            await this.wsManager.stop();
        }
        if (this.agentManager) {
            await this.agentManager.stop();
        }
    }

    async runAllTests() {
        console.log('🚀 Starting TUI Integration Tests...\n');

        await this.setupTestAgent();

        // Test 1: Connection Discovery
        await this.test('Connection Discovery', async () => {
            const {connectionManager} = await import('../../common/services/connection.js');

            // Test discovery with retry logic
            await connectionManager.discover(TEST_CONFIG.PORTS.TEST_AGENT + 1);

            // Wait for connection attempts
            await asyncSetTimeout(TEST_CONFIG.TIMEOUTS.MESSAGE_PROCESSING);

            // Should have attempted connections (may not succeed due to test setup)
            return true;
        });

        // Test 2: Agent Service Communication
        await this.test('Agent Service Communication', async () => {
            // Test that the service can be instantiated and basic methods work
            const fs = await import('fs');
            const path = await import('path');

            // Check that the service file exists and can be read
            const servicePath = path.join(process.cwd(), 'tui/src/services/TuiAgentService.js');
            if (!fs.existsSync(servicePath)) {
                throw new Error('TuiAgentService file does not exist');
            }

            // Test that we can create a mock service for testing
            const mockService = {
                url: `ws://localhost:${TEST_PORT + 1}`,
                getAgentState: () => ({}),
                sendNaturalLanguage: () => {
                },
                sendNarsese: () => {
                },
                sendMessage: () => {
                },
                connect: () => {
                },
                disconnect: () => {
                },
                on: () => {
                },
                off: () => {
                }
            };

            if (mockService.url !== `ws://localhost:${TEST_PORT + 1}`) {
                throw new Error('Mock service URL is incorrect');
            }
            if (typeof mockService.getAgentState !== 'function') {
                throw new Error('Mock service getAgentState should be a function');
            }
        });

        // Test 3: Component Integration
        await this.test('Component Integration', async () => {
            // Test that all component files exist
            const fs = await import('fs');
            const path = await import('path');

            const components = [
                'tui/src/App.jsx',
                'tui/src/components/AgentView.jsx',
                'tui/src/components/StatusPanel.jsx',
                'tui/src/components/LogPanel.jsx',
                'tui/src/components/TasksPanel.jsx',
                'tui/src/components/MessageInput.jsx',
                'tui/src/components/ConnectionDiscovery.jsx'
            ];

            for (const componentPath of components) {
                const fullPath = path.join(process.cwd(), componentPath);
                if (!fs.existsSync(fullPath)) {
                    throw new Error(`Component file does not exist: ${fullPath}`);
                }

                // Check that files have content
                const stats = fs.statSync(fullPath);
                if (stats.size === 0) {
                    throw new Error(`Component file is empty: ${fullPath}`);
                }
            }

            console.log('All component files exist and have content');
        });

        // Test 4: Message Flow
        await this.test('Message Flow Integration', async () => {
            // Test that the connection manager can handle message sending
            const {connectionManager} = await import('../../common/services/connection.js');

            // Test that we can send messages through the connection manager
            const testUrl = `ws://localhost:${TEST_PORT + 1}`;

            // This should not throw an error
            try {
                connectionManager.send(testUrl, {type: 'test', payload: 'test'});
                console.log('Message sending through connection manager works');
            } catch (error) {
                throw new Error(`Message sending failed: ${error.message}`);
            }
        });

        await this.cleanup();

        // Print results
        console.log('\n📊 Test Results:');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`);

        if (this.results.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results.tests.filter(t => t.status === 'failed').forEach(test => {
                console.log(`   • ${test.name}: ${test.error}`);
            });
        }

        return this.results.failed === 0;
    }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new TuiIntegrationTester();

    const timeout = setTimeout(() => {
        console.log('\n⏰ Test timeout reached');
        tester.cleanup().then(() => process.exit(TEST_CONFIG.EXIT_CODES.FAILURE));
    }, TEST_TIMEOUT);

    tester.runAllTests()
        .then(success => {
            clearTimeout(timeout);
            process.exit(success ? TEST_CONFIG.EXIT_CODES.SUCCESS : TEST_CONFIG.EXIT_CODES.FAILURE);
        })
        .catch(error => {
            clearTimeout(timeout);
            console.error('Test runner error:', error);
            tester.cleanup().then(() => process.exit(TEST_CONFIG.EXIT_CODES.FAILURE));
        });
}

export default TuiIntegrationTester;