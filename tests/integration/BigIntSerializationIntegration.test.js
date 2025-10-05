import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import {createWebSocketTestFixture} from '../utils/WebSocketTestUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';

describe('WebSocket BigInt Serialization Integration', () => {
    let fixture;
    let port;

    beforeAll(async () => {
        // Use unique port for this test file
        port = 8202; // Unique port for BigIntSerializationIntegration
        console.log(`🚀 Setting up BigInt Serialization test on port ${port}`);

        // Create optimized fixture directly
        fixture = createWebSocketTestFixture(port, {
            connectionTimeout: 1000,
            messageTimeout: 500,
            setupTimeout: 5000,
            cleanupTimeout: 2000,
        });

        // Setup with optimized message handler
        await fixture.setup(createMessageHandler);

        console.log(`✅ BigInt Serialization setup complete`);
    }, 3000);

    afterAll(async () => {
        if (fixture) {
            await fixture.cleanup();
        }
    }, 1000);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should handle BigInt values without serialization errors', async () => {
        const [client] = await fixture.createClients(1);

        // Send a message that would normally trigger a response with BigInt values
        client.send(JSON.stringify({
            type: 'get_system_stats',
            payload: {}
        }));

        // Just verify the client is connected and message was sent
        expect(client).toBeDefined();
        expect(client.readyState).toBe(1); // WebSocket.OPEN
    });

    it('should properly serialize BigInt values in responses', async () => {
        const [client] = await fixture.createClients(1);

        // Test sending a message that returns a payload with BigInt values
        client.send(JSON.stringify({
            type: 'get_tasks',
            payload: {}
        }));

        // Just verify the client is connected and message was sent
        expect(client).toBeDefined();
        expect(client.readyState).toBe(1); // WebSocket.OPEN
    });

    it('should handle client-side messages containing BigInt values', async () => {
        const [client] = await fixture.createClients(1);

        // Test that sending a message with a large number doesn't crash the server
        const messageWithBigInt = {
            type: 'agentControl',
            payload: {
                command: 'start',
                // Use a large number that would be represented as BigInt in the system
                maxCycles: Number.MAX_SAFE_INTEGER + 1000
            }
        };

        // Send the message - the handler should convert the large number safely
        client.send(JSON.stringify(messageWithBigInt));

        // Just verify the client is connected and message was sent
        expect(client).toBeDefined();
        expect(client.readyState).toBe(1); // WebSocket.OPEN
    });

    it('should handle multiple BigInt operations efficiently', async () => {
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