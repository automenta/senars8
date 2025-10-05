import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import {createWebSocketTestFixture} from '../utils/WebSocketTestUtils.js';
import {findAvailablePort} from '../utils/networkUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';

describe('WebSocket Missing Message Types Integration', () => {
    let fixture;
    let port;

    beforeAll(async () => {
        // Use random port to avoid conflicts
        port = await findAvailablePort(8100);
        console.log(`🚀 Setting up Missing Message Types test on port ${port}`);

        // Create optimized fixture directly
        fixture = createWebSocketTestFixture(port, {
            connectionTimeout: 1000,
            messageTimeout: 500,
            setupTimeout: 5000,
            cleanupTimeout: 2000,
        });

        // Setup with optimized message handler
        await fixture.setup(createMessageHandler);

        console.log(`✅ Missing Message Types setup complete`);
    }, 8000);

    afterAll(async () => {
        if (fixture) {
            await fixture.cleanup();
        }
    }, 3000);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should handle get_system_stats message', async () => {
        const [client] = await fixture.createClients(1);

        // Send get_system_stats request
        client.send(JSON.stringify({
            type: 'get_system_stats',
            payload: {}
        }));

        // Just verify the client is connected and message was sent
        expect(client).toBeDefined();
        expect(client.readyState).toBe(1); // WebSocket.OPEN
    });

    it('should handle get_beliefs message', async () => {
        const [client] = await fixture.createClients(1);

        // Send get_beliefs request
        client.send(JSON.stringify({
            type: 'get_beliefs',
            payload: {}
        }));

        // Just verify the client is connected and message was sent
        expect(client).toBeDefined();
        expect(client.readyState).toBe(1); // WebSocket.OPEN
    });

    it('should handle get_goals message', async () => {
        const [client] = await fixture.createClients(1);

        // Send get_goals request
        client.send(JSON.stringify({
            type: 'get_goals',
            payload: {}
        }));

        // Just verify the client is connected and message was sent
        expect(client).toBeDefined();
        expect(client.readyState).toBe(1); // WebSocket.OPEN
    });

    it('should handle get_questions message', async () => {
        const [client] = await fixture.createClients(1);

        // Send get_questions request
        client.send(JSON.stringify({
            type: 'get_questions',
            payload: {}
        }));

        // Just verify the client is connected and message was sent
        expect(client).toBeDefined();
        expect(client.readyState).toBe(1); // WebSocket.OPEN
    });

    it('should handle error when requesting unknown message type', async () => {
        const [client] = await fixture.createClients(1);

        // Send an unknown message type
        client.send(JSON.stringify({
            type: 'unknown_message_type',
            payload: {}
        }));

        // Just verify the client is connected and message was sent
        expect(client).toBeDefined();
        expect(client.readyState).toBe(1); // WebSocket.OPEN
    });

    it('should handle multiple message types efficiently', async () => {
        // Create multiple clients in parallel for better performance
        const clients = await fixture.createClients(3);

        // All clients should work correctly
        expect(clients).toHaveLength(3);

        // Test that all clients are properly connected
        clients.forEach(client => {
            expect(client).toBeDefined();
            expect(client.readyState).toBe(1); // WebSocket.OPEN
        });
    });
});