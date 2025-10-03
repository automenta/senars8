import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createConnection } from 'net';
import WebSocket from 'ws';
import { ServerProcessManager } from '../utils/ServerProcessManager.js';

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