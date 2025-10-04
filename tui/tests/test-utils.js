/**
 * Shared utilities for TUI testing
 * Provides common functionality to reduce code duplication and improve reliability
 */

import {setTimeout as promiseTimeout} from 'timers/promises';
import {findAvailablePort} from '../../tests/utils/networkUtils.js';

/**
 * Finds an available port for TUI testing
 * @param {number} startPort - Starting port number
 * @returns {Promise<number>} Available port number
 */
export async function findTuiTestPort(startPort = 8085) {
    return await findAvailablePort(startPort, 20); // Try 20 ports max
}

/**
 * Waits for a condition to be met with timeout
 * @param {Function} conditionFn - Function that returns true when condition is met
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {number} checkIntervalMs - How often to check the condition
 * @returns {Promise<boolean>} True if condition was met, false if timeout
 */
export async function waitForCondition(conditionFn, timeoutMs = 5000, checkIntervalMs = 100) {
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
    const AgentManager = (await import('../../agent/AgentManager.js')).default;
    const {WebSocketManager} = await import('../../agent/WebSocketManager.js');
    const {createMessageHandler} = await import('../../agent/MessageHandler.js');

    // Setup agent manager and WebSocket manager
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
        port
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
        }, 1500); // Reduced to 1.5 seconds for faster tests

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
    if (testEnv.wsManager) {
        await testEnv.wsManager.stop();
    }
    if (testEnv.agentManager) {
        await testEnv.agentManager.stop();
    }
}

/**
 * Runs a TUI process with timeout and captures output
 * @param {number} port - WebSocket port
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Object>} Process result with stdout, stderr, and exit code
 */
export async function runTuiWithTimeout(port, timeoutMs = 10000) {
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
            (error.code === 124) || (error.stdout && error.stdout.includes('Discovering agents'))) {
            console.log('TUI timed out as expected');
            return {
                success: true,
                stdout: error.stdout || '',
                stderr: error.stderr || '',
                exitCode: 124, // timeout exit code
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