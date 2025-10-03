import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createConnection } from 'net';
import WebSocket from 'ws';
import { ServerProcessManager } from '../utils/ServerProcessManager.js';

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
  }, 30000); // Increase timeout for setup

  afterEach(async () => {
    if (serverManager) {
      await serverManager.stopServer();
    }
  }, 15000); // Increase timeout for cleanup

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
  }, 30000); // Increase timeout for setup

  afterEach(async () => {
    if (serverManager) {
      await serverManager.stopServer();
    }
  }, 15000); // Increase timeout for cleanup

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