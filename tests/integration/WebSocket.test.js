import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {WebSocket, WebSocketServer} from 'ws';
import {findAvailablePort} from '../utils/networkUtils.js';

vi.mock('../../agent/Agent.js', () => ({
    Agent: vi.fn().mockImplementation(() => ({
        processMessage: vi.fn()
    }))
}));

describe('WebSocket Integration Tests', () => {
    let wss;
    let serverSocket;
    let clientSocket;
    let agent;
    let wsPort;

    beforeEach(async () => {
        wsPort = await findAvailablePort(8080);
        wss = new WebSocketServer({port: wsPort});

        // Set up server connection handler
        wss.on('connection', (ws) => {
            serverSocket = ws;
            agent = {processMessage: vi.fn()};
            ws.on('message', (message) => {
                try {
                    const parsedMessage = JSON.parse(message);
                    agent.processMessage(parsedMessage);
                } catch (e) {
                    // Ignore invalid JSON
                }
            });
        });

        // Create client connection
        clientSocket = new WebSocket(`ws://localhost:${wsPort}`);

        // Wait for both client and server to be ready
        await Promise.all([
            new Promise(resolve => clientSocket.on('open', resolve)),
            new Promise(resolve => wss.on('connection', resolve))
        ]);
    });

    afterEach(async () => {
        clientSocket?.close();
        await new Promise(resolve => wss.close(resolve));
    });

    it('should establish connection', () => {
        expect(clientSocket.readyState).toBe(WebSocket.OPEN);
        expect(serverSocket.readyState).toBe(WebSocket.OPEN);
    });

    it('should handle messages', async () => {
        const message = {type: 'test', payload: {data: 'hello'}};

        clientSocket.send(JSON.stringify(message));
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(agent.processMessage).toHaveBeenCalledWith(message);
    });

    it('should handle connection close', async () => {
        clientSocket.close();
        await new Promise(resolve => clientSocket.on('close', resolve));

        expect(clientSocket.readyState).toBe(WebSocket.CLOSED);
    });

    it('should handle invalid JSON gracefully', async () => {
        clientSocket.send('{ invalid json');

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(agent.processMessage).not.toHaveBeenCalled();
        expect(clientSocket.readyState).toBe(WebSocket.OPEN);
    });
});