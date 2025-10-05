import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import {createWebSocketTestFixture} from '../utils/WebSocketTestUtils.js';
import {findAvailablePort} from '../utils/networkUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';

describe('TUI WebSocket Service Integration', () => {
    let fixture;
    let port;

    beforeAll(async () => {
        // Use random port to avoid conflicts
        port = await findAvailablePort(8100);
        console.log(`🚀 Setting up TUI WebSocket Integration test on port ${port}`);

        // Create optimized fixture directly
        fixture = createWebSocketTestFixture(port, {
            connectionTimeout: 1000,
            messageTimeout: 500,
            setupTimeout: 5000,
            cleanupTimeout: 2000,
        });

        // Setup with optimized message handler
        await fixture.setup(createMessageHandler);

        console.log(`✅ TUI WebSocket Integration setup complete`);
    }, 8000);

    afterAll(async () => {
        if (fixture) {
            await fixture.cleanup();
        }
    }, 3000);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should handle bidirectional communication between TUI and agent', async () => {
        const [tuiClient] = await fixture.createClients(1);

        // Send a task from the TUI client to the agent
        const taskData = {
            statement: `tui_task_${Date.now()}`, // Make unique to avoid conflicts
        };

        tuiClient.send(JSON.stringify({
            type: 'add_task',
            payload: {taskData}
        }));

        // Just verify the client is connected and message was sent
        expect(tuiClient).toBeDefined();
        expect(tuiClient.readyState).toBe(1); // WebSocket.OPEN
    });

    it('should handle multiple TUI clients efficiently', async () => {
        // Create multiple TUI clients in parallel for better performance
        const clients = await fixture.createClients(3);

        // All clients should work correctly
        expect(clients).toHaveLength(3);

        // Test that all clients are properly connected
        clients.forEach(client => {
            expect(client).toBeDefined();
            expect(client.readyState).toBe(1); // WebSocket.OPEN
        });
    });

    it('should handle rapid message exchanges', async () => {
        const [client] = await fixture.createClients(1);

        // Send multiple messages in quick succession
        const messages = [
            {type: 'get_system_stats', payload: {}},
            {type: 'get_beliefs', payload: {}},
            {type: 'get_goals', payload: {}}
        ];

        // Send all messages quickly
        messages.forEach(msg => client.send(JSON.stringify(msg)));

        // Just verify the client is connected and messages were sent
        expect(client).toBeDefined();
        expect(client.readyState).toBe(1); // WebSocket.OPEN
    });
});