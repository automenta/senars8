import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import { createConnection } from 'net';
import WebSocket from 'ws';

/**
 * ServerProcessManager - Manages server process lifecycle with proper cleanup
 */
class ServerProcessManager {
  constructor() {
    this.process = null;
    this.port = null;
    this.wsPort = null;
    this.cleanupFunctions = [];
  }

  /**
   * Finds an available port by testing connections
   * @param {number} startPort - Starting port to check
   * @param {number} maxTries - Maximum number of ports to try
   * @returns {Promise<number>} An available port number
   */
  async findAvailablePort(startPort = 8080, maxTries = 50) {
    for (let port = startPort; port < startPort + maxTries; port++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error(`Could not find available port after ${maxTries} attempts`);
  }

  /**
   * Checks if a port is available for use
   * @param {number} port - The port to check
   * @returns {Promise<boolean>} True if the port is available
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = createConnection({ port });

      server.once('connect', () => {
        server.end();
        resolve(false); // Port is in use
      });

      server.once('error', (err) => {
        server.destroy();
        // If ECONNREFUSED, the port is available
        resolve(err.code === 'ECONNREFUSED');
      });
    });
  }

  /**
   * Sets up the environment for the server process
   * @param {number} port - The port to use for the main server
   * @param {number} wsPort - The port to use for WebSocket server
   * @returns {object} Environment variables for the process
   */
  setupEnvironment(port, wsPort) {
    // Create a copy of process.env to avoid modifying global environment
    const env = { ...process.env };

    // Set environment variables that might affect the server ports
    env.PORT = port.toString();
    env.WS_PORT = wsPort.toString();

    return env;
  }

  /**
   * Starts the development server process
   * @param {number} port - Port to run the main server on
   * @param {number} wsPort - Port to run the WebSocket server on
   * @returns {Promise<ChildProcess>} The spawned server process
   */
  async startServer(port, wsPort) {
    this.port = port;
    this.wsPort = wsPort;

    const env = this.setupEnvironment(port, wsPort);

    // Spawn the main entry point with the --web flag
    this.process = spawn('node', ['main.js', '--web'], {
      env,
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Capture process output for debugging
    const output = [];
    const errors = [];

    this.process.stdout.on('data', (data) => {
      const str = data.toString();
      output.push(str);
      // Log to console if running in verbose mode
      if (process.env.VITEST_VERBOSE) {
        console.log(`[SERVER-OUT] ${str.trim()}`);
      }
    });

    this.process.stderr.on('data', (data) => {
      const str = data.toString();
      errors.push(str);
      // Log to console if running in verbose mode
      if (process.env.VITEST_VERBOSE) {
        console.error(`[SERVER-ERR] ${str.trim()}`);
      }
    });

    // Store references for later inspection
    this.output = output;
    this.errors = errors;

    // Add cleanup functions
    this.cleanupFunctions.push(() => {
      if (this.process && !this.process.killed) {
        try {
          // Kill the entire process group to ensure all child processes are terminated
          process.kill(-this.process.pid, 'SIGTERM');
        } catch (e) {
          // Process might already be killed
        }
      }
    });

    // Wait for the server to be ready - check WebSocket
    await this.waitForServerReady(port, wsPort, 30000); // Wait up to 30 seconds

    return this.process;
  }

  /**
   * Waits for the server to become ready by testing WebSocket connection
   * @param {number} port - The main server port to test
   * @param {number} wsPort - The WebSocket server port to test
   * @param {number} timeoutMs - Maximum time to wait in milliseconds
   * @returns {Promise<void>} Resolves when server is ready
   */
  async waitForServerReady(port, wsPort, timeoutMs) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Check if the WebSocket port is available (should NOT be available if server is running)
        if (await this.isPortAvailable(wsPort)) {
          // WebSocket port is not in use yet, wait a bit more
          await new Promise(resolve => setTimeout(resolve, 200));
          continue;
        }

        // Try to connect to the WebSocket server to confirm it's working
        const ws = new WebSocket(`ws://localhost:${wsPort}`);

        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket connection timeout'));
          }, 1000);

          ws.on('open', () => {
            clearTimeout(timeout);
            ws.close();
            resolve();
          });

          ws.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });

        // If we get here, the WebSocket server is working
        return;
      } catch (err) {
        // Server might not be ready yet, wait a bit more
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    throw new Error(`Server did not start within ${timeoutMs}ms`);
  }

  /**
   * Stops the server process with proper cleanup
   * @returns {Promise<void>}
   */
  async stopServer() {
    if (this.process && !this.process.killed) {
      try {
        // Kill the entire process group to ensure all child processes are terminated
        process.kill(-this.process.pid, 'SIGTERM');
      } catch (err) {
        // If group kill fails, try individual process kill
        try {
          this.process.kill('SIGTERM');
        } catch (e) {
          // Process might already be killed
        }
      }

      // Wait a bit for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force kill if still running
      try {
        process.kill(-this.process.pid, 'SIGKILL');
      } catch (err) {
        try {
          if (!this.process.killed) {
            this.process.kill('SIGKILL');
          }
        } catch (e) {
          // Process already killed
        }
      }
    }

    // Execute all cleanup functions
    for (const cleanup of this.cleanupFunctions) {
      try {
        cleanup();
      } catch (err) {
        // Ignore cleanup errors
      }
    }
    this.cleanupFunctions = [];
    
    // Clear the process reference
    this.process = null;
  }

  /**
   * Gets the collected server output
   * @returns {string} Combined stdout and stderr
   */
  getOutput() {
    return {
      stdout: this.output ? this.output.join('') : '',
      stderr: this.errors ? this.errors.join('') : '',
      combined: (this.output ? this.output.join('') : '') + (this.errors ? this.errors.join('') : '')
    };
  }
}

describe('WebUI End-to-End Test', () => {
  let serverManager;
  let testPort;
  let wsPort;

  beforeEach(async () => {
    serverManager = new ServerProcessManager();

    // Find available ports
    testPort = await serverManager.findAvailablePort(8080);
    wsPort = await serverManager.findAvailablePort(8081); // Default WebSocket port

    // Start the server with separate ports for HTTP and WebSocket
    await serverManager.startServer(testPort, wsPort);
  }, 40000); // Increase timeout for setup since we're starting a full process

  afterEach(async () => {
    if (serverManager) {
      await serverManager.stopServer();
    }
  }, 15000); // Increase timeout for cleanup

  it('should establish WebSocket connection without errors', async () => {
    // Verify WebSocket connection to the agent service
    const ws = new WebSocket(`ws://localhost:${wsPort}`);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket connection failed: ${err.message}`));
      });
    });
  }, 8000);

  it('should handle basic WebSocket messages without crashing', async () => {
    // Test message exchange
    const ws = new WebSocket(`ws://localhost:${wsPort}`);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket message exchange timeout'));
      }, 5000);

      let connected = false;

      ws.on('open', () => {
        connected = true;
        // Send a test message
        ws.send(JSON.stringify({ type: 'test_message', payload: { test: true } }));
      });

      ws.on('message', (data) => {
        clearTimeout(timeout);
        ws.close();
        resolve();
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket message error: ${err.message}`));
      });
    });
  }, 8000);

  it('should initialize agent manager without startup errors', async () => {
    // This test is now separate from the WebSocket testing since it tests agent manager independently
    const AgentManager = (await import('../../agent/AgentManager.js')).default;
    const mockBroadcast = vi.fn();
    const agentManager = new AgentManager(mockBroadcast);
    await expect(agentManager.initialize()).resolves.not.toThrow();
    const agent = agentManager.getAgent();
    // Note: Agent class doesn't have an isInitialized property as seen in the original test
    expect(agent).toBeDefined();
  }, 8000);
});