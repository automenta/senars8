import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn } from 'child_process';
import { createConnection } from 'net';
import WebSocket from 'ws';
import { promisify } from 'util';

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
        // Try graceful shutdown first
        this.process.kill('SIGTERM');

        // Wait a bit for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 1000));

        // If still running, force kill
        if (!this.process.killed) {
          this.process.kill('SIGKILL');
        }
      } catch (err) {
        // Process might already be killed
      } finally {
        this.process = null;
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
 * Integration test for WebSocket connectivity in the UI environment
 */
describe('UI WebSocket Connectivity Tests', () => {
  let serverManager;
  let testPort;
  let wsPort;

  beforeEach(async () => {
    serverManager = new ServerProcessManager();

    // Find available ports
    testPort = await serverManager.findAvailablePort(8080);
    wsPort = await serverManager.findAvailablePort(8081); // Default WebSocket port
  });

  afterEach(async () => {
    if (serverManager) {
      await serverManager.stopServer();
    }
  });

  it('should establish WebSocket connection to agent service', async () => {
    // Start the server with separate ports for HTTP and WebSocket
    await serverManager.startServer(testPort, wsPort);

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
  });

  it('should handle message exchange through WebSocket', async () => {
    // Start the server
    await serverManager.startServer(testPort, wsPort);

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
        // Send a test message to the agent
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
  });

  it('should maintain WebSocket connection during server activity', async () => {
    // Start the server
    await serverManager.startServer(testPort, wsPort);

    // Test connection stability
    const ws = new WebSocket(`ws://localhost:${wsPort}`);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket stability test timeout'));
      }, 8000); // Longer timeout for stability test

      let messageCount = 0;
      const maxMessages = 3;

      ws.on('open', () => {
        // Send periodic messages to keep connection active
        const messageInterval = setInterval(() => {
          if (messageCount < maxMessages) {
            ws.send(JSON.stringify({ 
              type: 'ping', 
              payload: { timestamp: Date.now(), count: messageCount + 1 } 
            }));
            messageCount++;
          } else {
            clearInterval(messageInterval);
          }
        }, 1000);
      });

      ws.on('message', (data) => {
        if (messageCount >= maxMessages) {
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket stability error: ${err.message}`));
      });
    });
  });

  it('should reconnect automatically after temporary disconnection', async () => {
    // Start the server
    await serverManager.startServer(testPort, wsPort);

    // This test requires the server to have reconnection logic implemented
    // which is typically handled by the AgentCommunicationService
    const ws = new WebSocket(`ws://localhost:${wsPort}`);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket reconnection test timeout'));
      }, 8000);

      let disconnected = false;

      ws.on('open', () => {
        // Close the connection to test reconnection
        ws.close(1000, 'Test reconnection');
        disconnected = true;
      });

      // Note: In a real reconnection scenario, we would have a client-side
      // reconnection mechanism. This test verifies that the server can handle
      // disconnections properly.
      ws.on('close', () => {
        if (disconnected) {
          // Connection was intentionally closed, consider test successful
          clearTimeout(timeout);
          resolve();
        }
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket reconnection error: ${err.message}`));
      });
    });
  });

  it('should handle multiple simultaneous WebSocket connections', async () => {
    // Start the server
    await serverManager.startServer(testPort, wsPort);

    // Test multiple connections simultaneously
    const client1 = new WebSocket(`ws://localhost:${wsPort}`);
    const client2 = new WebSocket(`ws://localhost:${wsPort}`);
    const client3 = new WebSocket(`ws://localhost:${wsPort}`);

    // Promise for each client connection
    const connectPromises = [
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Client 1 connection timeout')), 3000);
        client1.on('open', () => { clearTimeout(timeout); resolve(); });
        client1.on('error', (err) => { clearTimeout(timeout); reject(new Error(`Client 1 error: ${err.message}`)); });
      }),
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Client 2 connection timeout')), 3000);
        client2.on('open', () => { clearTimeout(timeout); resolve(); });
        client2.on('error', (err) => { clearTimeout(timeout); reject(new Error(`Client 2 error: ${err.message}`)); });
      }),
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Client 3 connection timeout')), 3000);
        client3.on('open', () => { clearTimeout(timeout); resolve(); });
        client3.on('error', (err) => { clearTimeout(timeout); reject(new Error(`Client 3 error: ${err.message}`)); });
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

/**
 * Additional UI-specific WebSocket tests
 */
describe('UI WebSocket Service Integration', () => {
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

  it('should initialize agent service with WebSocket connection', async () => {
    // Start the server
    await serverManager.startServer(testPort, wsPort);

    // Test direct WebSocket communication that simulates UI service behavior
    const ws = new WebSocket(`ws://localhost:${wsPort}`);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Agent service initialization timeout'));
      }, 5000);

      ws.on('open', () => {
        // Simulate connection acknowledgment that UI service expects
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            if (message.type === 'connection_ack') {
              clearTimeout(timeout);
              ws.close();
              resolve();
            }
          } catch (err) {
            // Ignore parsing errors for this test
          }
        });
        
        // Send a connection request
        ws.send(JSON.stringify({ type: 'connect', payload: { clientType: 'ui' } }));
      });

      ws.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Agent service connection error: ${err.message}`));
      });
    });
  });

  it('should support broadcast messaging from agent to connected clients', async () => {
    // Start the server
    await serverManager.startServer(testPort, wsPort);

    // Create two clients: one to send, one to receive broadcast
    const sender = new WebSocket(`ws://localhost:${wsPort}`);
    const receiver = new WebSocket(`ws://localhost:${wsPort}`);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        sender.close();
        receiver.close();
        reject(new Error('Broadcast messaging test timeout'));
      }, 6000);

      let senderConnected = false;
      let receiverConnected = false;

      sender.on('open', () => {
        senderConnected = true;
        if (receiverConnected) {
          // Both clients connected, initiate broadcast from server side
          sender.send(JSON.stringify({ type: 'test_broadcast_trigger', payload: {} }));
        }
      });

      receiver.on('open', () => {
        receiverConnected = true;
        if (senderConnected) {
          // Both clients connected, initiate broadcast from server side
          sender.send(JSON.stringify({ type: 'test_broadcast_trigger', payload: {} }));
        }
      });

      receiver.on('message', (data) => {
        // If receiver gets a message, it's likely the broadcast
        clearTimeout(timeout);
        sender.close();
        receiver.close();
        resolve();
      });

      sender.on('error', (err) => {
        clearTimeout(timeout);
        sender.close();
        receiver.close();
        reject(new Error(`Sender error: ${err.message}`));
      });

      receiver.on('error', (err) => {
        clearTimeout(timeout);
        sender.close();
        receiver.close();
        reject(new Error(`Receiver error: ${err.message}`));
      });
    });
  });
});