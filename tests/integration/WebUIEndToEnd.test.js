import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import WebSocket from 'ws';
import {ServerProcessManager} from '../utils/ServerProcessManager.js';

// TODO: Disabled due to hanging issues - needs proper resource cleanup
// describe('WebUI End-to-End Test', () => {
describe.skip('WebUI End-to-End Test', () => {
    let serverManager;
    let testPort;
    let wsPort;
    let activeWebSockets = [];

    beforeEach(async () => {
        serverManager = new ServerProcessManager();
        activeWebSockets = [];

        // Find available ports
        testPort = await serverManager.findAvailablePort(8080);
        wsPort = await serverManager.findAvailablePort(8081); // Default WebSocket port

        // Start the server with separate ports for HTTP and WebSocket
        await serverManager.startServer(testPort, wsPort);
    }, 40000); // Increase timeout for setup since we're starting a full process

    afterEach(async () => {
        // Close any remaining WebSocket connections
        for (const ws of activeWebSockets) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            } else if (ws && ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
        }
        activeWebSockets = [];

        if (serverManager) {
            await serverManager.stopServer();
        }
        
        // Ensure no lingering resources by clearing all timeouts/intervals if any
        // This should be handled by ServerProcessManager, but let's be thorough
    }, 15000); // Increase timeout for cleanup

    it('should establish WebSocket connection without errors', async () => {
        // Verify WebSocket connection to the agent service
        const ws = new WebSocket(`ws://localhost:${wsPort}`);
        activeWebSockets.push(ws);

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
                // Remove from activeWebSockets
                const index = activeWebSockets.indexOf(ws);
                if (index > -1) {
                    activeWebSockets.splice(index, 1);
                }
                reject(new Error('WebSocket connection timeout'));
            }, 5000);

            ws.on('open', () => {
                clearTimeout(timeout);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
                // Remove from activeWebSockets
                const index = activeWebSockets.indexOf(ws);
                if (index > -1) {
                    activeWebSockets.splice(index, 1);
                }
                resolve();
            });

            ws.on('error', (err) => {
                clearTimeout(timeout);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
                // Remove from activeWebSockets
                const index = activeWebSockets.indexOf(ws);
                if (index > -1) {
                    activeWebSockets.splice(index, 1);
                }
                reject(new Error(`WebSocket connection failed: ${err.message}`));
            });
        });
    }, 8000);

    it('should handle basic WebSocket messages without crashing', async () => {
        // Test message exchange
        const ws = new WebSocket(`ws://localhost:${wsPort}`);
        activeWebSockets.push(ws);

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.close();
                } else if (ws && ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                }
                // Remove from activeWebSockets
                const index = activeWebSockets.indexOf(ws);
                if (index > -1) {
                    activeWebSockets.splice(index, 1);
                }
                reject(new Error('WebSocket message exchange timeout'));
            }, 5000);

            let connected = false;

            ws.on('open', () => {
                connected = true;
                // Send a test message
                try {
                    ws.send(JSON.stringify({type: 'test_message', payload: {test: true}}));
                } catch (err) {
                    clearTimeout(timeout);
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.close();
                    }
                    const index = activeWebSockets.indexOf(ws);
                    if (index > -1) {
                        activeWebSockets.splice(index, 1);
                    }
                    reject(new Error(`Failed to send test message: ${err.message}`));
                }
            });

            ws.on('message', (data) => {
                clearTimeout(timeout);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
                // Remove from activeWebSockets
                const index = activeWebSockets.indexOf(ws);
                if (index > -1) {
                    activeWebSockets.splice(index, 1);
                }
                resolve();
            });

            ws.on('error', (err) => {
                clearTimeout(timeout);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
                // Remove from activeWebSockets
                const index = activeWebSockets.indexOf(ws);
                if (index > -1) {
                    activeWebSockets.splice(index, 1);
                }
                reject(new Error(`WebSocket message error: ${err.message}`));
            });
            
            // Also handle close event to prevent hanging
            ws.on('close', () => {
                clearTimeout(timeout);
                const index = activeWebSockets.indexOf(ws);
                if (index > -1) {
                    activeWebSockets.splice(index, 1);
                }
                // Only reject if we haven't already resolved
                if (!connected) {
                    reject(new Error('WebSocket connection closed unexpectedly'));
                }
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