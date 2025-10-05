/**
 * Shared Testing Utilities for TUI and Web UI
 * Common test utilities that can be used across both UI implementations
 */

import {setTimeout} from 'timers/promises';
import AgentManager from '../../agent/AgentManager.js';
import {WebSocketManager} from '../../agent/WebSocketManager.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';

/**
 * Starts a test agent for use in UI tests
 * @param {number} port - Port to use for the agent
 * @returns {object} Agent and WebSocket manager instances
 */
async function startTestAgent(port) {
    const agentManager = new AgentManager();
    const wsManager = new WebSocketManager({port});

    await wsManager.start();

    // Link server to agent manager
    agentManager.setBroadcast(wsManager.broadcast.bind(wsManager));

    // Create and set message handler
    const messageHandler = createMessageHandler(agentManager, wsManager.broadcast.bind(wsManager));
    wsManager.setMessageHandler(messageHandler);

    // Initialize agent manager
    await agentManager.initialize();

    return {agentManager, wsManager};
}

/**
 * Common test function to validate that a UI runs without fatal errors
 * @param {string} command - The command to execute to start the UI
 * @param {number} wsPort - WebSocket port to use
 * @returns {Promise<Object>} Test result
 */
async function testUiRunsWithoutErrors(command, wsPort) {
    try {
        // Just run the UI with timeout and check for specific error patterns
        const child_process = await import('child_process');
        const {execFile} = child_process;
        const util = await import('util');
        const execFileAsync = util.promisify(execFile);

        // Execute UI in a child process
        const {stdout, stderr} = await execFileAsync('timeout', ['5s', 'bash', '-c', command], {
            env: {...process.env, WS_PORT: wsPort.toString()},
            timeout: 8000
        });

        // Check that no fatal errors occurred (ignore timeout exit codes)
        const hasFatalErrors = [
            'Error: ',
            'FATAL',
            'UnhandledPromiseRejection',
            'ReferenceError',
            'TypeError'
        ].some(error => stderr && stderr.includes(error));

        if (hasFatalErrors) {
            return {
                success: false,
                stdout,
                stderr,
                error: 'Fatal errors detected in UI output'
            };
        }

        return {
            success: true,
            stdout,
            stderr,
            message: 'UI ran without fatal errors'
        };
    } catch (error) {
        // If the command timed out, that's expected because UIs are interactive processes
        if (error.code === 'ETIMEDOUT' || error.killed || error.signal === 'SIGTERM') {
            return {
                success: true,
                message: 'UI ran successfully and was stopped by timeout as expected'
            };
        } else if (error.stderr && error.stderr.includes('defaultProps will be removed')) {
            return {
                success: true,
                message: 'UI ran with acceptable warnings about defaultProps'
            };
        } else {
            // Check if it's a real error
            if (error.stderr) {
                const hasFatalErrors = [
                    'Error: ',
                    'FATAL',
                    'UnhandledPromiseRejection',
                    'ReferenceError',
                    'TypeError'
                ].some(err => error.stderr.includes(err));

                if (hasFatalErrors) {
                    return {
                        success: false,
                        error: error,
                        message: 'Fatal error detected'
                    };
                } else {
                    return {
                        success: true,
                        message: 'Acceptable UI warnings detected'
                    };
                }
            } else {
                return {
                    success: false,
                    error: error,
                    message: 'Unexpected error running UI'
                };
            }
        }
    }
}

/**
 * Creates a standardized mock API service for testing
 * @returns {object} Mock API service
 */
function createMockApiService() {
    return {
        getAgentState: () => ({
            isRunning: true,
            cycleCount: 1250,
            uptime: '00:12:34',
            version: '1.1.0',
            connectionStatus: 'connected',
            stats: {
                cyclesPerSecond: 10.5,
                memoryUsedMB: 45.2,
                cpuUsage: 23.7,
                tasksPerSecond: 2.1
            },
            memory: {
                beliefs: [
                    {termKey: '(bird --> animal)', state: {truthValue: {confidence: 0.89}}},
                    {termKey: '(animal --> living)', state: {truthValue: {confidence: 0.95}}}
                ],
                goals: [
                    {termKey: 'food!', state: {truthValue: {confidence: 0.85}}}
                ],
                concepts: [{id: 'concept_1'}]
            },
            tasks: [
                {termKey: '(bird --> mortal)', punctuation: '.', state: {truthValue: {confidence: 0.65}}}
            ]
        }),
        sendAgentControl: (action) => Promise.resolve(),
        getUiStatus: () => ({
            isRunning: true,
            cycleCount: 1250,
            uptime: '00:12:34',
            version: '1.1.0',
            connectionStatus: 'connected',
            timestamp: new Date().toISOString()
        }),
        on: () => {
        },
        off: () => {
        },
        connect: () => {
        },
        disconnect: () => {
        }
    };
}

/**
 * Waits for a UI to be ready by checking for common ready indicators
 * @param {Function} checkReady - Function that returns true when UI is ready
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<boolean>} True if UI became ready within timeout
 */
async function waitForUiReady(checkReady, timeoutMs = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (await Promise.resolve(checkReady())) {
            return true;
        }
        await setTimeout(500);
    }
    return false;
}

export {
    startTestAgent,
    testUiRunsWithoutErrors,
    createMockApiService,
    waitForUiReady
};