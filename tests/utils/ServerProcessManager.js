import { spawn } from 'child_process';
import { createConnection } from 'net';
import WebSocket from 'ws';

/**
 * ServerProcessManager - Manages server process lifecycle with proper cleanup
 */
export class ServerProcessManager {
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
    await this.waitForServerReady(port, wsPort, 20000); // Reduced timeout to 20 seconds

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
    // Set up a timeout promise that will reject if the server doesn't start in time
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Server did not start within ${timeoutMs}ms. Process may still be running.`));
      }, timeoutMs);
    });

    // Set up the actual server readiness check
    const readyPromise = (async () => {
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
            const connectionTimeout = setTimeout(() => {
              ws.close();
              reject(new Error('WebSocket connection timeout'));
            }, 2000); // 2 second timeout for WebSocket connection

            ws.on('open', () => {
              clearTimeout(connectionTimeout);
              ws.close();
              resolve();
            });

            ws.on('error', (err) => {
              clearTimeout(connectionTimeout);
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
    })();

    // Use Promise.race to ensure timeout is honored
    try {
      await Promise.race([readyPromise, timeoutPromise]);
    } catch (error) {
      // If we get here due to timeout, ensure the process is killed
      if (error.message.includes('Server did not start within')) {
        if (this.process && !this.process.killed) {
          console.log(`Killing server process due to timeout. PID: ${this.process.pid}`);
          try {
            process.kill(-this.process.pid, 'SIGKILL');
          } catch (killErr) {
            // Process may have already died
            console.log(`Process may have already been killed: ${killErr.message}`);
          }
        }
      }
      throw error;
    }
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
        console.log(`Sent SIGTERM to process group ${-this.process.pid}`);
      } catch (err) {
        // If group kill fails, try individual process kill
        try {
          this.process.kill('SIGTERM');
          console.log(`Sent SIGTERM to process ${this.process.pid}`);
        } catch (e) {
          // Process might already be killed
          console.log(`Process ${this.process.pid} may already be killed: ${e.message}`);
        }
      }

      // Wait a bit for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force kill if still running
      try {
        process.kill(-this.process.pid, 'SIGKILL');
        console.log(`Sent SIGKILL to process group ${-this.process.pid}`);
      } catch (err) {
        try {
          if (!this.process.killed) {
            this.process.kill('SIGKILL');
            console.log(`Sent SIGKILL to process ${this.process.pid}`);
          }
        } catch (e) {
          // Process already killed
          console.log(`Process ${this.process.pid} already killed: ${e.message}`);
        }
      }
    }

    // Execute all cleanup functions
    for (const cleanup of this.cleanupFunctions) {
      try {
        cleanup();
      } catch (err) {
        // Ignore cleanup errors
        console.log(`Cleanup function error: ${err.message}`);
      }
    }
    this.cleanupFunctions = [];

    // Clear the process reference
    this.process = null;
    console.log('Server stopped and cleanup completed');
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