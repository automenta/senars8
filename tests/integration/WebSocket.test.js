import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {WebSocket, WebSocketServer} from 'ws';
import {closeWebSocket, createWebSocketClient, waitForSocketState} from '../utils/WebSocketTestUtils.js';
import {Agent} from '../../agent/Agent.js';
import {findAvailablePort} from '../utils/networkUtils.js';

// Mock the Agent class
vi.mock('../../agent/Agent.js', () => {
    const Agent = vi.fn();
    Agent.prototype.processMessage = vi.fn();
    return {Agent};
});

describe('WebSocket Integration Tests', () => {
    let wss;
    let serverSocket;
    let clientSocket;
    let agent;
    let wsPort;

    beforeEach(async () => {
        vi.clearAllMocks();
        wsPort = await findAvailablePort(8080);
        wss = new WebSocketServer({port: wsPort});

        const connectionPromise = new Promise(resolve => {
            wss.on('connection', (ws) => {
                serverSocket = ws;
                agent = new Agent();
                ws.on('message', (message) => {
                    try {
                        const parsedMessage = JSON.parse(message);
                        agent.processMessage(parsedMessage);
                    } catch (e) {
                        // Don't crash the server on invalid JSON
                    }
                });
                resolve();
            });
        });

        clientSocket = await createWebSocketClient(`ws://localhost:${wsPort}`);
        await connectionPromise;
    });

    afterEach(async () => {
        await closeWebSocket(clientSocket);
        // Ensure the server is fully closed before the next test
        if (wss) {
            await new Promise(resolve => wss.close(resolve));
        }
    });

    it('should establish a connection', () => {
        expect(clientSocket.readyState).toBe(WebSocket.OPEN);
        expect(serverSocket.readyState).toBe(WebSocket.OPEN);
    });

    it('should handle message serialization and deserialization', async () => {
        const message = {type: 'test', payload: {data: 'hello'}};

        const messagePromise = new Promise(resolve => {
            agent.processMessage.mockImplementation((receivedMessage) => {
                resolve(receivedMessage);
            });
        });

        clientSocket.send(JSON.stringify(message));

        const received = await messagePromise;
        expect(received).toEqual(message);
    });

    it('should handle client-side close', async () => {
        const serverClosePromise = new Promise(resolve => serverSocket.on('close', resolve));

        clientSocket.close();
        await serverClosePromise;

        await waitForSocketState(clientSocket, WebSocket.CLOSED);
        await waitForSocketState(serverSocket, WebSocket.CLOSED);

        expect(clientSocket.readyState).toBe(WebSocket.CLOSED);
        expect(serverSocket.readyState).toBe(WebSocket.CLOSED);
    });

    it('should handle server-side close', async () => {
        const clientClosePromise = new Promise(resolve => clientSocket.on('close', resolve));

        serverSocket.close();
        await clientClosePromise;

        await waitForSocketState(clientSocket, WebSocket.CLOSED);
        await waitForSocketState(serverSocket, WebSocket.CLOSED);

        expect(clientSocket.readyState).toBe(WebSocket.CLOSED);
        expect(serverSocket.readyState).toBe(WebSocket.CLOSED);
    });

    it('should handle invalid JSON messages gracefully without disconnecting', async () => {
        const invalidJson = '{ "type": "test", "payload": { "data": "hello" ';

        // agent.processMessage is a mock from vi.mock at the top of the file
        const processMessageSpy = agent.processMessage;

        clientSocket.send(invalidJson);

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(processMessageSpy).not.toHaveBeenCalled();
        expect(clientSocket.readyState).toBe(WebSocket.OPEN);
        expect(serverSocket.readyState).toBe(WebSocket.OPEN);
    });
});