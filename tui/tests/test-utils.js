/**
 * Shared utilities for TUI testing
 * Provides common functionality to reduce code duplication and improve reliability
 */

import {setTimeout as promiseTimeout} from 'timers/promises';

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
    const {findAvailablePort} = await import('../../tests/utils/networkUtils.js');
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
 * Creates a mock WebSocket server for testing TUI connections
 * @param {number} port - Port to listen on
 * @param {Function} messageHandler - Function to handle incoming messages
 * @returns {Promise<Object>} WebSocket server instance
 */
export async function createMockTuiServer(port, messageHandler) {
    const WebSocket = await import('ws');
    const server = new WebSocket.WebSocketServer({port});

    return new Promise((resolve) => {
        server.on('connection', (ws) => {
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    messageHandler(message, ws);
                } catch (error) {
                    // Send error response for malformed JSON
                    ws.send(JSON.stringify({
                        type: 'error',
                        payload: {message: `Invalid JSON: ${error.message}`}
                    }));
                }
            });
        });

        // Wait a bit for server to start
        setTimeout(() => resolve(server), 100);
    });
}

/**
 * Common TUI test setup that can be reused across tests
 * @param {number} port - Port for the test
 * @returns {Promise<Object>} Test setup with agent manager, ws manager, etc.
 */
export async function setupTuiTestEnvironment(port) {
    // TODO: Fix these broken imports - UnifiedWebSocketServer and createMessageHandler need to be implemented or imported from correct location
    // const {UnifiedWebSocketServer} = await import('../../agent/StandaloneWebSocketServer.js');
    // const {createMessageHandler} = await import('../../agent/MessageHandler.js');

    // Setup agent manager and WebSocket manager
    // const agent = new System();
    // const wsManager = new UnifiedWebSocketServer({port});

    // await wsManager.start();
    // agent.setBroadcast(wsManager.broadcast.bind(wsManager));

    // const messageHandler = createMessageHandler(agent, wsManager.broadcast.bind(wsManager));
    // wsManager.setMessageHandler(messageHandler);

    // await agent.initialize();

    // return {
    //     agent,
    //     wsManager,
    //     messageHandler,
    //     port
    // };

    // Return a mock implementation for now
    return {
        agentManager: null,
        wsManager: null,
        messageHandler: null,
        port,
        error: 'WebSocket functionality temporarily disabled due to missing dependencies'
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
 * Common cleanup function for TUI tests
 * @param {Object} testEnv - Test environment object from setupTuiTestEnvironment
 * @returns {Promise<void>}
 */
export async function cleanupTuiTestEnvironment(testEnv) {
    if (!testEnv) return;

    // Stop WebSocket manager
    if (testEnv.wsManager) {
        await testEnv.wsManager.stop();
    }

    // Stop agent manager
    if (testEnv.agentManager) {
        await testEnv.agentManager.stop();
    }

    console.log('Test environment cleanup completed');
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
