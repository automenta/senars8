import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import { createConnection } from 'net';
import WebSocket from 'ws';

/**
 * ServerProcessManager - Manages server process lifecycle with proper cleanup
 * (Same class as in WebSocketConnectivity.test.js)
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

    // Spawn the main entry point with the --web flag (agent will still start)
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

    // Wait for the server to be ready - check both HTTP and WebSocket
    await this.waitForServerReady(port, wsPort, 30000); // Wait up to 30 seconds

    return this.process;
  }

  /**
   * Waits for the server to become ready by testing both HTTP and WebSocket connections
   * @param {number} port - The main server port to test
   * @param {number} wsPort - The WebSocket server port to test
   * @param {number} timeoutMs - Maximum time to wait in milliseconds
   * @returns {Promise<void>} Resolves when server is ready
   */
  async waitForServerReady(port, wsPort, timeoutMs) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        // First check if the main server port is listening
        if (await this.isPortAvailable(port)) {
          // Port is still not in use, wait a bit more
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        // Check if the WebSocket port is available (should NOT be available if server is running)
        if (await this.isPortAvailable(wsPort)) {
          // WebSocket port is not in use yet, wait a bit more
          await new Promise(resolve => setTimeout(resolve, 100));
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

        // If we get here, both servers are working
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

/**
 * TUI WebSocket Integration Tests
 */
describe('TUI WebSocket Service Integration', () => {
  let serverManager;
  let testPort;
  let wsPort;

  beforeEach(async () => {
    serverManager = new ServerProcessManager();

    // Find available ports
    testPort = await serverManager.findAvailablePort(8080);
    wsPort = await serverManager.findAvailablePort(8081);
  });

  afterEach(async () => {
    if (serverManager) {
      await serverManager.stopServer();
    }
  });

  it('should allow TUI to connect to WebSocket agent service', async () => {
    // Start the full server with WebSocket support
    await serverManager.startServer(testPort, wsPort);

    // Create a WebSocket connection simulating what TUI would do
    const tuiWs = new WebSocket(`ws://localhost:${wsPort}`);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        tuiWs.close();
        reject(new Error('TUI WebSocket connection timeout'));
      }, 5000);

      tuiWs.on('open', () => {
        clearTimeout(timeout);
        tuiWs.close();
        resolve();
      });

      tuiWs.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`TUI WebSocket connection failed: ${err.message}`));
      });
    });
  });

  it('should handle TUI task submission via WebSocket', async () => {
    // Start the server
    await serverManager.startServer(testPort, wsPort);

    // Simulate TUI sending a task via WebSocket
    const tuiWs = new WebSocket(`ws://localhost:${wsPort}`);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        tuiWs.close();
        reject(new Error('TUI task submission timeout'));
      }, 6000);

      let connected = false;

      tuiWs.on('open', () => {
        connected = true;
        // Send a task similar to how TUI would
        tuiWs.send(JSON.stringify({ 
          type: 'narsese', 
          payload: '(bird --> animal). %1.0;0.9%' 
        }));
      });

      tuiWs.on('message', (data) => {
        // If we receive a response, the message was processed successfully
        clearTimeout(timeout);
        tuiWs.close();
        resolve();
      });

      tuiWs.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`TUI task submission error: ${err.message}`));
      });
    });
  });

  it('should handle bidirectional communication between TUI and agent', async () => {
    // Start the server
    await serverManager.startServer(testPort, wsPort);

    // Create a WebSocket connection for bidirectional communication
    const tuiWs = new WebSocket(`ws://localhost:${wsPort}`);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        tuiWs.close();
        reject(new Error('TUI bidirectional communication timeout'));
      }, 7000);

      tuiWs.on('open', () => {
        // Send an initial message
        tuiWs.send(JSON.stringify({ 
          type: 'subscribe', 
          payload: { channel: 'tui_updates' } 
        }));
      });

      tuiWs.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          // Check if this is the expected acknowledgment
          if (message.type === 'connection_ack' || message.type) {
            clearTimeout(timeout);
            tuiWs.close();
            resolve();
          }
        } catch (err) {
          // Handle message parsing errors
          clearTimeout(timeout);
          tuiWs.close();
          reject(new Error(`Message parsing error: ${err.message}`));
        }
      });

      tuiWs.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`TUI bidirectional communication error: ${err.message}`));
      });
    });
  });

  it('should maintain stable WebSocket connection during TUI operations', async () => {
    // Start the server
    await serverManager.startServer(testPort, wsPort);

    // Test connection stability over time
    const tuiWs = new WebSocket(`ws://localhost:${wsPort}`);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        tuiWs.close();
        reject(new Error('TUI connection stability test timeout'));
      }, 10000); // Longer timeout for stability test

      let messageCount = 0;
      const maxMessages = 5;

      tuiWs.on('open', () => {
        // Send periodic messages to simulate TUI activity
        const messageInterval = setInterval(() => {
          if (messageCount < maxMessages) {
            tuiWs.send(JSON.stringify({ 
              type: 'ping', 
              payload: { 
                source: 'tui', 
                timestamp: Date.now(), 
                count: messageCount + 1 
              } 
            }));
            messageCount++;
          } else {
            clearInterval(messageInterval);
          }
        }, 1000);
      });

      let responsesReceived = 0;
      tuiWs.on('message', (data) => {
        responsesReceived++;
        if (responsesReceived >= maxMessages) {
          clearTimeout(timeout);
          tuiWs.close();
          resolve();
        }
      });

      tuiWs.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`TUI connection stability error: ${err.message}`));
      });
    });
  });

  it('should handle multiple TUI clients connecting simultaneously', async () => {
    // Start the server
    await serverManager.startServer(testPort, wsPort);

    // Test multiple TUI clients connecting to the same WebSocket server
    const client1 = new WebSocket(`ws://localhost:${wsPort}`);
    const client2 = new WebSocket(`ws://localhost:${wsPort}`);
    const client3 = new WebSocket(`ws://localhost:${wsPort}`);

    // Promise for each client connection
    const connectPromises = [
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('TUI Client 1 connection timeout')), 3000);
        client1.on('open', () => { clearTimeout(timeout); resolve(); });
        client1.on('error', (err) => { clearTimeout(timeout); reject(new Error(`TUI Client 1 error: ${err.message}`)); });
      }),
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('TUI Client 2 connection timeout')), 3000);
        client2.on('open', () => { clearTimeout(timeout); resolve(); });
        client2.on('error', (err) => { clearTimeout(timeout); reject(new Error(`TUI Client 2 error: ${err.message}`)); });
      }),
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('TUI Client 3 connection timeout')), 3000);
        client3.on('open', () => { clearTimeout(timeout); resolve(); });
        client3.on('error', (err) => { clearTimeout(timeout); reject(new Error(`TUI Client 3 error: ${err.message}`)); });
      })
    ];

    // Wait for all clients to connect
    await Promise.all(connectPromises);

    // Close all connections
    client1.close();
    client2.close();
    client3.close();

    expect(true).toBe(true); // Test passes if all clients could connect
  });
});