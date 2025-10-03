import {beforeEach, describe, expect, it, vi, afterEach} from 'vitest';
import {StandaloneWebSocketServer} from '../../agent/StandaloneWebSocketServer.js';
import WebSocket from 'ws';
import {awaitNextMessage, closeWebSocket, createWebSocketClient} from '../utils/WebSocketTestUtils.js';

describe('Simple WebSocket Integration Test', () => {
    let wsServer;
    let wsPort = 8090; // Use a different port to avoid conflicts
    let connectedClients = [];

    beforeEach(async () => {
        wsServer = new StandaloneWebSocketServer(wsPort);
        
        // Create a mock agent manager for testing
        const mockAgentManager = {
            start: vi.fn(),
            stop: vi.fn(),
            broadcast: vi.fn(),
            system: {
                commandBus: {
                    request: vi.fn()
                }
            }
        };
        
        // Set up a simple message handler for testing
        const mockMessageHandler = vi.fn();
        wsServer.setMessageHandler(mockMessageHandler);
        
        await wsServer.start(mockAgentManager);
    });

    afterEach(async () => {
        // Close all connected clients
        connectedClients.forEach(ws => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        });
        connectedClients = [];
        
        // Stop the server
        if (wsServer) {
            await wsServer.stop();
        }
    });

    it('should accept WebSocket connections and send connection_ack', async () => {
        const ws = new WebSocket(`ws://localhost:${wsPort}`);
        connectedClients.push(ws);

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 2000);

            ws.on('open', () => {
                clearTimeout(timeout);
                resolve();
            });

            ws.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        // Wait for the connection_ack message
        const messagePromise = new Promise((resolve, reject) => {
            const messageTimeout = setTimeout(() => reject(new Error('Message timeout')), 2000);
            
            ws.on('message', (data) => {
                clearTimeout(messageTimeout);
                try {
                    const message = JSON.parse(data);
                    resolve(message);
                } catch (err) {
                    reject(err);
                }
            });
        });

        const message = await messagePromise;
        expect(message.type).toBe('connection_ack');
        expect(message.payload).toBeDefined();
        
        ws.close();
    });

    it('should handle basic message echoing', async () => {
        // Create a mock agent manager with a simple command handling
        const mockAgentManager = {
            start: vi.fn(),
            stop: vi.fn(),
            broadcast: vi.fn(),
            system: {
                commandBus: {
                    request: vi.fn().mockResolvedValue(true)
                }
            }
        };
        
        // Restart the server with the new agent manager that has the handler
        await wsServer.stop();
        wsServer = new StandaloneWebSocketServer(wsPort);
        
        // Set up a simple message handler for agent control
        const messageHandler = async (message, ws) => {
            if (message.type === 'agentControl') {
                if (message.payload?.command === 'start') {
                    ws.send(JSON.stringify({type: 'status_update', payload: 'running'}));
                } else if (message.payload?.command === 'stop') {
                    ws.send(JSON.stringify({type: 'status_update', payload: 'stopped'}));
                }
            } else if (message.type === 'add_task') {
                ws.send(JSON.stringify({type: 'task_added', payload: {task: message.payload?.taskData || 'test'}}));
            }
        };
        
        wsServer.setMessageHandler(messageHandler);
        await wsServer.start(mockAgentManager);

        const ws = new WebSocket(`ws://localhost:${wsPort}`);
        connectedClients.push(ws);

        // Wait for connection and connection_ack
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Connection timeout')), 2000);
            ws.on('open', () => clearTimeout(timeout) && resolve());
            ws.on('error', (err) => reject(err));
        });

        // Consume the connection_ack message
        const ackPromise = new Promise((resolve, reject) => {
            const ackTimeout = setTimeout(() => reject(new Error('Ack timeout')), 2000);
            ws.on('message', (data) => {
                clearTimeout(ackTimeout);
                resolve(JSON.parse(data));
            });
        });
        await ackPromise;

        // Send a start command
        ws.send(JSON.stringify({type: 'agentControl', payload: {command: 'start'}}));

        // Wait for the response
        const responsePromise = new Promise((resolve, reject) => {
            const responseTimeout = setTimeout(() => reject(new Error('Response timeout')), 2000);
            ws.on('message', (data) => {
                clearTimeout(responseTimeout);
                resolve(JSON.parse(data));
            });
        });

        const response = await responsePromise;
        expect(response.type).toBe('status_update');
        expect(response.payload).toBe('running');
        
        ws.close();
    });
});