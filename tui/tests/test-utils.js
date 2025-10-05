/**
 * Shared utilities for TUI testing
 * Provides common functionality to reduce code duplication and improve reliability
 */

import {setTimeout as promiseTimeout} from 'timers/promises';
import {findAvailablePort} from '../../tests/utils/networkUtils.js';

// Test configuration constants
export const TEST_CONFIG = {
    PORTS: {
        START: 8085,
        MAX_RETRIES: 20,
        TEST_AGENT: 8085,
        MOCK_SERVERS: {
            DISCOVERY: 8086,
            SERVICE: 8087,
            ERROR_HANDLING: 8088,
            MESSAGE_FLOW: 8089
        }
    },
    TIMEOUTS: {
        SETUP: 1500,
        CONNECTION: 1000,
        MESSAGE_PROCESSING: 500,
        CONDITION_CHECK: 100,
        TEST_CONDITION: 5000,
        TUI_RUN: 10000,
        INTEGRATION_TEST: 30000,
        GRACEFUL_SHUTDOWN: 500
    },
    EXIT_CODES: {
        TIMEOUT: 124,
        SUCCESS: 0,
        FAILURE: 1
    },
    RETRY_INTERVALS: {
        FAST: 100,
        MEDIUM: 500,
        SLOW: 1000
    }
};

// Common mock responses for consistent testing
export const MOCK_RESPONSES = {
    SYSTEM_STATS: {
        type: 'system_stats',
        payload: {
            isRunning: true,
            cycleCount: 100,
            uptime: '00:01:30',
            connectionStatus: 'connected',
            stats: {
                cyclesPerSecond: 5.2,
                memoryUsedMB: 32.1,
                cpuUsage: 15.3,
                tasksPerSecond: 1.8
            }
        }
    },
    TASKS_RESPONSE: {
        type: 'tasks_response',
        payload: {
            tasks: [
                {termKey: '(test --> integration)', punctuation: '.', state: {truthValue: {confidence: 0.8}}},
                {termKey: 'automated_test!', punctuation: '!', state: {truthValue: {confidence: 0.9}}}
            ]
        }
    },
    BELIEFS_RESPONSE: {
        type: 'beliefs_response',
        payload: {
            beliefs: [
                {termKey: '(automated --> testing)', punctuation: '.', state: {truthValue: {confidence: 0.95}}}
            ]
        }
    },
    GOALS_RESPONSE: {
        type: 'goals_response',
        payload: {
            goals: [
                {termKey: 'pass_all_tests!', punctuation: '!', state: {truthValue: {confidence: 1.0}}}
            ]
        }
    },
    LOG_RESPONSE: (message) => ({
        type: 'log',
        payload: `✅ Processed: ${message}`
    }),
    ERROR_RESPONSE: (error) => ({
        type: 'error',
        payload: {message: `Invalid JSON: ${error.message}`}
    })
};

/**
 * Finds an available port for TUI testing
 * @param {number} startPort - Starting port number (default: TEST_CONFIG.PORTS.START)
 * @returns {Promise<number>} Available port number
 */
export async function findTuiTestPort(startPort = TEST_CONFIG.PORTS.START) {
    return await findAvailablePort(startPort, TEST_CONFIG.PORTS.MAX_RETRIES);
}

/**
 * Waits for a condition to be met with timeout
 * @param {Function} conditionFn - Function that returns true when condition is met
 * @param {number} timeoutMs - Timeout in milliseconds (default: TEST_CONFIG.TIMEOUTS.TEST_CONDITION)
 * @param {number} checkIntervalMs - How often to check the condition (default: TEST_CONFIG.RETRY_INTERVALS.FAST)
 * @returns {Promise<boolean>} True if condition was met, false if timeout
 */
export async function waitForCondition(conditionFn, timeoutMs = TEST_CONFIG.TIMEOUTS.TEST_CONDITION, checkIntervalMs = TEST_CONFIG.RETRY_INTERVALS.FAST) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        try {
            if (await conditionFn()) {
                return true;
            }
        } catch (error) {
            // Continue checking if condition throws
        }

        await promiseTimeout(checkIntervalMs);
    }

    return false;
}

/**
 * Creates a standardized mock WebSocket server for testing
 * Handles common message types with consistent responses
 * @param {number} port - Port to listen on
 * @param {Object} customHandlers - Optional custom message handlers to extend/override defaults
 * @returns {Promise<Object>} WebSocket server instance with connection tracking
 */
export async function createMockTuiServer(port, customHandlers = {}) {
    try {
        const WebSocket = await import('ws');
        const server = new WebSocket.WebSocketServer({port});

        const connections = new Set();
        let connectionHandler = null;
        let isClosing = false;

        const messageHandler = (data, ws) => {
            if (isClosing) return;

            try {
                const message = JSON.parse(data.toString());
                handleMessage(message, ws, customHandlers);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
                try {
                    ws.send(JSON.stringify(MOCK_RESPONSES.ERROR_RESPONSE(error)));
                } catch (sendError) {
                    console.error('Error sending error response:', sendError);
                }
            }
        };

        return new Promise((resolve, reject) => {
            server.on('connection', (ws) => {
                if (isClosing) return;

                connections.add(ws);

                ws.on('message', (data) => messageHandler(data, ws));

                ws.on('close', () => {
                    connections.delete(ws);
                });

                ws.on('error', (error) => {
                    console.error('Mock WebSocket client error:', error);
                    connections.delete(ws);
                });

                try {
                    if (connectionHandler) {
                        connectionHandler(ws);
                    }
                } catch (error) {
                    console.error('Error in connection handler:', error);
                }
            });

            server.on('error', (error) => {
                console.error('Mock WebSocket server error:', error);
                reject(error);
            });

            // Wait for server to start with timeout
            const startTimeout = setTimeout(() => {
                if (!isClosing) {
                    resolve({
                        server,
                        connections,
                        onConnection: (handler) => { connectionHandler = handler; },
                        close: async () => {
                            if (isClosing) return;
                            isClosing = true;

                            // Close all client connections first
                            const closePromises = Array.from(connections).map(ws => {
                                return new Promise(resolve => {
                                    ws.close();
                                    resolve();
                                });
                            });

                            await Promise.all(closePromises);

                            // Then close the server
                            return new Promise(resolve => {
                                server.close((error) => {
                                    if (error) {
                                        console.error('Error closing mock server:', error);
                                    }
                                    resolve();
                                });
                            });
                        }
                    });
                }
            }, TEST_CONFIG.RETRY_INTERVALS.FAST);

            // Handle server start errors
            server.on('listening', () => {
                clearTimeout(startTimeout);
            });
        });
    } catch (error) {
        console.error('Failed to create mock WebSocket server:', error);
        throw error;
    }
}

/**
 * Handles incoming WebSocket messages with standard responses
 * @param {Object} message - Parsed message object
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} customHandlers - Custom message handlers
 */
function handleMessage(message, ws, customHandlers) {
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
        default:
            // Handle custom message types if provided
            if (customHandlers[type]) {
                customHandlers[type](message, ws);
            } else {
                console.log(`Unhandled message type: ${type}`);
            }
    }
}

/**
 * Creates a test agent manager and WebSocket manager pair
 * Consolidates common setup logic used across test files
 * @param {number} port - Port for WebSocket server
 * @returns {Promise<Object>} Configured agent and WebSocket managers
 */
export async function createTestAgentEnvironment(port) {
    const AgentManager = (await import('../../agent/AgentManager.js')).default;
    const {WebSocketManager} = await import('../../agent/WebSocketManager.js');
    const {createMessageHandler} = await import('../../agent/MessageHandler.js');

    const agentManager = new AgentManager();
    const wsManager = new WebSocketManager({port});

    await wsManager.start();
    agentManager.setBroadcast(wsManager.broadcast.bind(wsManager));

    const messageHandler = createMessageHandler(agentManager, wsManager.broadcast.bind(wsManager));
    wsManager.setMessageHandler(messageHandler);

    await agentManager.initialize();

    return {
        agentManager,
        wsManager,
        messageHandler,
        port,
        cleanup: async () => {
            if (wsManager) {
                await wsManager.stop();
            }
            if (agentManager) {
                await agentManager.stop();
            }
        }
    };
}

/**
 * Common TUI test setup that can be reused across tests
 * @param {number} port - Port for the test
 * @returns {Promise<Object>} Test setup with agent manager, ws manager, etc.
 */
export async function setupTuiTestEnvironment(port) {
    const env = await createTestAgentEnvironment(port);
    return {
        agentManager: env.agentManager,
        wsManager: env.wsManager,
        messageHandler: env.messageHandler,
        port: env.port,
        cleanup: env.cleanup
    };
}

/**
 * Starts a test agent with the specified port
 * @param {number} port - Port for the agent WebSocket server
 * @returns {Promise<Object>} Agent process and port info
 */
export async function startTestAgent(port) {
    const {spawn} = await import('child_process');

    return new Promise((resolve, reject) => {
        // Start agent process with the specified port
        const agentProcess = spawn('node', ['agent/start-agent.js'], {
            env: {...process.env, WS_PORT: port.toString()},
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: true // Create as detached process
        });

        let stdout = '';
        let stderr = '';
        let started = false;

        const startTimeout = setTimeout(() => {
            if (!started) {
                console.log('Agent startup timeout, proceeding anyway');
                started = true;
                resolve({
                    process: agentProcess,
                    port,
                    stdout,
                    stderr
                });
            }
        }, TEST_CONFIG.TIMEOUTS.SETUP);

        agentProcess.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            console.log('Agent stdout:', output);

            // Check if agent has started successfully
            if (output.includes('Agent and WebSocket server started') && !started) {
                started = true;
                clearTimeout(startTimeout);
                resolve({
                    process: agentProcess,
                    port,
                    stdout,
                    stderr
                });
            }
        });

        agentProcess.stderr.on('data', (data) => {
            const output = data.toString();
            stderr += output;
            console.log('Agent stderr:', output);
        });

        agentProcess.on('error', (error) => {
            clearTimeout(startTimeout);
            if (!started) {
                reject(error);
            }
        });

        // Handle process exit
        agentProcess.on('exit', (code) => {
            console.log(`Agent process exited with code ${code}`);
        });
    });
}

/**
 * Common cleanup function for TUI tests
 * @param {Object} testEnv - Test environment object from setupTuiTestEnvironment
 * @returns {Promise<void>}
 */
export async function cleanupTuiTestEnvironment(testEnv) {
    if (!testEnv) return;

    const cleanupPromises = [];

    // Stop WebSocket manager
    if (testEnv.wsManager) {
        cleanupPromises.push(
            testEnv.wsManager.stop().catch(error => {
                console.error('Error stopping WebSocket manager:', error);
            })
        );
    }

    // Stop agent manager
    if (testEnv.agentManager) {
        cleanupPromises.push(
            testEnv.agentManager.stop().catch(error => {
                console.error('Error stopping agent manager:', error);
            })
        );
    }

    // Wait for all cleanup operations to complete
    if (cleanupPromises.length > 0) {
        await Promise.all(cleanupPromises);
    }

    console.log('Test environment cleanup completed');
}

/**
 * Runs a TUI process with timeout and captures output
 * @param {number} port - WebSocket port
 * @param {number} timeoutMs - Timeout in milliseconds (default: TEST_CONFIG.TIMEOUTS.TUI_RUN)
 * @returns {Promise<Object>} Process result with stdout, stderr, and exit code
 */
export async function runTuiWithTimeout(port, timeoutMs = TEST_CONFIG.TIMEOUTS.TUI_RUN) {
    const {spawn} = await import('child_process');
    const {promisify} = await import('util');
    const {execFile} = await import('child_process');
    const execFileAsync = promisify(execFile);

    try {
        console.log(`Running TUI with timeout: ${timeoutMs}ms on port ${port}`);

        const {stdout, stderr} = await execFileAsync(
            'timeout',
            [`${timeoutMs / 1000}s`, 'bash', '-c', `WS_PORT=${port} npx tsx tui/src/index.jsx || true`],
            {
                env: {...process.env, WS_PORT: port.toString()},
                timeout: timeoutMs + 1000
            }
        );

        console.log('TUI completed without timeout');
        return {
            success: true,
            stdout,
            stderr,
            exitCode: 0
        };
    } catch (error) {
        console.log('TUI execution caught error:', error.message);

        // Check if it was a timeout (which is expected for interactive TUI)
        if (error.code === 'ETIMEDOUT' || error.killed || error.signal === 'SIGTERM' ||
            (error.code === TEST_CONFIG.EXIT_CODES.TIMEOUT) || (error.stdout && error.stdout.includes('Discovering agents'))) {
            console.log('TUI timed out as expected');
            return {
                success: true,
                stdout: error.stdout || '',
                stderr: error.stderr || '',
                exitCode: TEST_CONFIG.EXIT_CODES.TIMEOUT,
                timedOut: true
            };
        }

        console.log('TUI failed with error:', error.message);
        return {
            success: false,
            stdout: error.stdout || '',
            stderr: error.stderr || '',
            exitCode: error.code,
            error: error.message
        };
    }
}

/**
 * Validates that TUI output doesn't contain fatal errors
 * @param {string} stderr - Standard error output
 * @param {string} stdout - Standard output (optional)
 * @returns {boolean} True if no fatal errors found
 */
export function validateTuiOutput(stderr, stdout = '') {
    const fatalErrors = [
        'Error: ',
        'FATAL',
        'UnhandledPromiseRejection',
        'ReferenceError',
        'TypeError'
    ];

    const combinedOutput = `${stderr} ${stdout}`;

    return !fatalErrors.some(error => combinedOutput.includes(error));
}

/**
 * Common error patterns that should be ignored in TUI tests
 * @param {string} error - Error message to check
 * @returns {boolean} True if error should be ignored
 */
export function shouldIgnoreError(error) {
    const ignorablePatterns = [
        'defaultProps will be removed',
        'Warning:',
        'DeprecationWarning:',
        'timeout',
        'SIGTERM',
        'ETIMEDOUT'
    ];

    return ignorablePatterns.some(pattern => error.includes(pattern));
}

// Export constants for use in other files
export {TEST_CONFIG, MOCK_RESPONSES};
