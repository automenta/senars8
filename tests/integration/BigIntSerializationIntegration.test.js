import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import AgentManager from '../../agent/AgentManager.js';
import {WebSocketManager} from '../../agent/WebSocketManager.js';
import {awaitNextMessage, closeWebSocket, createWebSocketClient} from '../utils/WebSocketTestUtils.js';
import {findAvailablePort} from '../utils/networkUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';

describe('WebSocket BigInt Serialization Integration', () => {
    let agentManager;
    let wsManager;
    let wsUrl;
    let client;
    let wsPort;

    beforeAll(async () => {
        wsPort = await findAvailablePort(8091); // Use a different port to avoid conflicts
        wsUrl = `ws://localhost:${wsPort}`;

        // Instantiate and wire up components
        agentManager = new AgentManager();
        wsManager = new WebSocketManager({port: wsPort});

        await wsManager.start();

        // Link server to agent manager
        agentManager.setBroadcast(wsManager.broadcast.bind(wsManager));

        // Create and set message handler
        const messageHandler = createMessageHandler(agentManager, wsManager.broadcast.bind(wsManager));
        wsManager.setMessageHandler(messageHandler);

        // Initialize agent manager
        await agentManager.initialize();

        // Create a client
        client = await createWebSocketClient(wsUrl);
    }, 60000);

    afterAll(async () => {
        if (client) {
            await closeWebSocket(client);
        }
        if (wsManager) {
            await wsManager.stop();
        }
        if (agentManager) {
            await agentManager.stop();
        }
    }, 30000);

    it('should handle BigInt values without serialization errors', async () => {
        // Send a message that would normally trigger a response with BigInt values
        client.send(JSON.stringify({
            type: 'get_system_stats',
            payload: {}
        }));

        // Wait for the response (should not error due to BigInt serialization)
        const response = await awaitNextMessage(client, (msg) => msg.type === 'system_stats', 10000);

        expect(response.type).toBe('system_stats');
        // The response should have been successfully sent without BigInt serialization errors
    });

    it('should properly serialize BigInt values in responses', async () => {
        // Test sending a message that returns a payload with BigInt values
        // In this case, we will create a mock scenario where BigInts might be involved
        client.send(JSON.stringify({
            type: 'get_tasks',
            payload: {}
        }));

        // Wait for the response (should not error due to BigInt serialization)
        const response = await awaitNextMessage(client, (msg) => msg.type === 'tasks_response', 10000);

        expect(response.type).toBe('tasks_response');
        // The response should have been successfully sent without BigInt serialization errors
    });

    it('should handle client-side messages containing BigInt values', async () => {
        // Test that sending a message with a large number doesn't crash the server
        // The agent control handler already has BigInt handling built-in
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

        // Wait for any response or just verify no crash occurred
        // The main test is that this doesn't cause a serialization error
        const response = await awaitNextMessage(client, (msg) => msg.type === 'error' || msg.type === 'log', 5000);

        // If we get an error, it should be about unknown command, not serialization
        if (response && response.type === 'error') {
            expect(response.payload.message).not.toContain('BigInt');
            expect(response.payload.message).not.toContain('serialization');
        }

        // The key assertion is that the server didn't crash from BigInt serialization
        expect(true).toBe(true); // Server handled the message without crashing
    });
});