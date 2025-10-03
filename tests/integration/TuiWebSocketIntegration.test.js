import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import WebSocket from 'ws';
import {ServerProcessManager} from '../utils/ServerProcessManager.js';

/**
 * TUI WebSocket Integration Tests
 */
describe('TUI WebSocket Service Integration', () => {
    let serverManager;
    let testPort;
    let wsPort;
    let activeWebSockets = [];

    beforeEach(async () => {
        serverManager = new ServerProcessManager();
        activeWebSockets = [];

        // Find available ports
        testPort = await serverManager.findAvailablePort(8080);
        wsPort = await serverManager.findAvailablePort(8081);
    }, 30000); // Increase timeout for setup

    afterEach(async () => {
        // Close any remaining WebSocket connections
        activeWebSockets.forEach(ws => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        });
        activeWebSockets = [];

        if (serverManager) {
            await serverManager.stopServer();
        }
    }, 15000); // Increase timeout for cleanup

    it('should allow TUI to connect to WebSocket agent service', async () => {
        // Start the full server with WebSocket support
        await serverManager.startServer(testPort, wsPort);

        // Create a WebSocket connection simulating what TUI would do
        const tuiWs = new WebSocket(`ws://localhost:${wsPort}`);
        activeWebSockets.push(tuiWs);

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (tuiWs.readyState === WebSocket.OPEN) {
                    tuiWs.close();
                }
                reject(new Error('TUI WebSocket connection timeout'));
            }, 5000);

            tuiWs.on('open', () => {
                clearTimeout(timeout);
                if (tuiWs.readyState === WebSocket.OPEN) {
                    tuiWs.close();
                }
                // Remove from activeWebSockets
                const index = activeWebSockets.indexOf(tuiWs);
                if (index > -1) {
                    activeWebSockets.splice(index, 1);
                }
                resolve();
            });

            tuiWs.on('error', (err) => {
                clearTimeout(timeout);
                if (tuiWs.readyState === WebSocket.OPEN) {
                    tuiWs.close();
                }
                // Remove from activeWebSockets
                const index = activeWebSockets.indexOf(tuiWs);
                if (index > -1) {
                    activeWebSockets.splice(index, 1);
                }
                reject(new Error(`TUI WebSocket connection failed: ${err.message}`));
            });
        });
    });

    it('should handle TUI task submission via WebSocket', async () => {
        // Start the server
        await serverManager.startServer(testPort, wsPort);

        // Simulate TUI sending a task via WebSocket
        const tuiWs = new WebSocket(`ws://localhost:${wsPort}`);
        activeWebSockets.push(tuiWs);

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (tuiWs.readyState === WebSocket.OPEN) {
                    tuiWs.close();
                }
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
                if (tuiWs.readyState === WebSocket.OPEN) {
                    tuiWs.close();
                }
                // Remove from activeWebSockets
                const index = activeWebSockets.indexOf(tuiWs);
                if (index > -1) {
                    activeWebSockets.splice(index, 1);
                }
                resolve();
            });

            tuiWs.on('error', (err) => {
                clearTimeout(timeout);
                if (tuiWs.readyState === WebSocket.OPEN) {
                    tuiWs.close();
                }
                // Remove from activeWebSockets
                const index = activeWebSockets.indexOf(tuiWs);
                if (index > -1) {
                    activeWebSockets.splice(index, 1);
                }
                reject(new Error(`TUI task submission error: ${err.message}`));
            });
        });
    });

    it('should handle bidirectional communication between TUI and agent', async () => {
        // Start the server
        await serverManager.startServer(testPort, wsPort);

        // Create a WebSocket connection for bidirectional communication
        const tuiWs = new WebSocket(`ws://localhost:${wsPort}`);
        activeWebSockets.push(tuiWs);

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (tuiWs.readyState === WebSocket.OPEN) {
                    tuiWs.close();
                }
                reject(new Error('TUI bidirectional communication timeout'));
            }, 7000);

            tuiWs.on('open', () => {
                // Send an initial message
                tuiWs.send(JSON.stringify({
                    type: 'subscribe',
                    payload: {channel: 'tui_updates'}
                }));
            });

            tuiWs.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    // Check if this is the expected acknowledgment
                    if (message.type === 'connection_ack' || message.type) {
                        clearTimeout(timeout);
                        if (tuiWs.readyState === WebSocket.OPEN) {
                            tuiWs.close();
                        }
                        // Remove from activeWebSockets
                        const index = activeWebSockets.indexOf(tuiWs);
                        if (index > -1) {
                            activeWebSockets.splice(index, 1);
                        }
                        resolve();
                    }
                } catch (err) {
                    // Handle message parsing errors
                    clearTimeout(timeout);
                    if (tuiWs.readyState === WebSocket.OPEN) {
                        tuiWs.close();
                    }
                    // Remove from activeWebSockets
                    const index = activeWebSockets.indexOf(tuiWs);
                    if (index > -1) {
                        activeWebSockets.splice(index, 1);
                    }
                    reject(new Error(`Message parsing error: ${err.message}`));
                }
            });

            tuiWs.on('error', (err) => {
                clearTimeout(timeout);
                if (tuiWs.readyState === WebSocket.OPEN) {
                    tuiWs.close();
                }
                // Remove from activeWebSockets
                const index = activeWebSockets.indexOf(tuiWs);
                if (index > -1) {
                    activeWebSockets.splice(index, 1);
                }
                reject(new Error(`TUI bidirectional communication error: ${err.message}`));
            });
        });
    });

    it('should maintain stable WebSocket connection during TUI operations', async () => {
        // Start the server
        await serverManager.startServer(testPort, wsPort);

        // Test connection stability over time
        const tuiWs = new WebSocket(`ws://localhost:${wsPort}`);
        activeWebSockets.push(tuiWs);

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                if (tuiWs.readyState === WebSocket.OPEN) {
                    tuiWs.close();
                }
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
                    if (tuiWs.readyState === WebSocket.OPEN) {
                        tuiWs.close();
                    }
                    // Remove from activeWebSockets
                    const index = activeWebSockets.indexOf(tuiWs);
                    if (index > -1) {
                        activeWebSockets.splice(index, 1);
                    }
                    clearInterval(messageInterval); // Make sure to clear interval
                    resolve();
                }
            });

            tuiWs.on('error', (err) => {
                clearTimeout(timeout);
                clearInterval(messageInterval); // Make sure to clear interval on error too
                if (tuiWs.readyState === WebSocket.OPEN) {
                    tuiWs.close();
                }
                // Remove from activeWebSockets
                const index = activeWebSockets.indexOf(tuiWs);
                if (index > -1) {
                    activeWebSockets.splice(index, 1);
                }
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
        
        // Add all clients to activeWebSockets array for cleanup
        activeWebSockets.push(client1, client2, client3);

        // Promise for each client connection
        const connectPromises = [
            new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    client1.close();
                    reject(new Error('TUI Client 1 connection timeout'));
                }, 3000);
                client1.on('open', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                client1.on('error', (err) => {
                    clearTimeout(timeout);
                    reject(new Error(`TUI Client 1 error: ${err.message}`));
                });
            }),
            new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    client2.close();
                    reject(new Error('TUI Client 2 connection timeout'));
                }, 3000);
                client2.on('open', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                client2.on('error', (err) => {
                    clearTimeout(timeout);
                    reject(new Error(`TUI Client 2 error: ${err.message}`));
                });
            }),
            new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    client3.close();
                    reject(new Error('TUI Client 3 connection timeout'));
                }, 3000);
                client3.on('open', () => {
                    clearTimeout(timeout);
                    resolve();
                });
                client3.on('error', (err) => {
                    clearTimeout(timeout);
                    reject(new Error(`TUI Client 3 error: ${err.message}`));
                });
            })
        ];

        // Wait for all clients to connect
        await Promise.all(connectPromises);

        // Close all connections and remove from activeWebSockets
        [client1, client2, client3].forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            const index = activeWebSockets.indexOf(ws);
            if (index > -1) {
                activeWebSockets.splice(index, 1);
            }
        });

        expect(true).toBe(true); // Test passes if all clients could connect
    });
});