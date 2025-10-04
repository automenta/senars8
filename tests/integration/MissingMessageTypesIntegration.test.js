import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import AgentManager from '../../agent/AgentManager.js';
import {WebSocketManager} from '../../agent/WebSocketManager.js';
import {awaitNextMessage, closeWebSocket, createWebSocketClient} from '../utils/WebSocketTestUtils.js';
import {findAvailablePort} from '../utils/networkUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';

describe('WebSocket Missing Message Types Integration', () => {
    let agentManager;
    let wsManager;
    let wsUrl;
    let client;
    let wsPort;

    beforeAll(async () => {
        wsPort = await findAvailablePort(8090); // Use a different port to avoid conflicts
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

    it('should handle get_system_stats message', async () => {
        // Send get_system_stats request
        client.send(JSON.stringify({
            type: 'get_system_stats',
            payload: {}
        }));

        // Wait for the response
        const response = await awaitNextMessage(client, (msg) => msg.type === 'system_stats', 10000);

        expect(response.type).toBe('system_stats');
        expect(response.payload).toHaveProperty('isRunning');
        expect(response.payload).toHaveProperty('cycleCount');
        expect(response.payload).toHaveProperty('taskCount');
        expect(response.payload).toHaveProperty('beliefsCount');
        expect(response.payload).toHaveProperty('goalsCount');
        expect(response.payload).toHaveProperty('questionsCount');
    });

    it('should handle get_beliefs message', async () => {
        // Send get_beliefs request
        client.send(JSON.stringify({
            type: 'get_beliefs',
            payload: {}
        }));

        // Wait for the response
        const response = await awaitNextMessage(client, (msg) => msg.type === 'beliefs_response', 10000);

        expect(response.type).toBe('beliefs_response');
        expect(response.payload).toHaveProperty('beliefs');
        expect(Array.isArray(response.payload.beliefs)).toBe(true);
    });

    it('should handle get_goals message', async () => {
        // Send get_goals request
        client.send(JSON.stringify({
            type: 'get_goals',
            payload: {}
        }));

        // Wait for the response
        const response = await awaitNextMessage(client, (msg) => msg.type === 'goals_response', 10000);

        expect(response.type).toBe('goals_response');
        expect(response.payload).toHaveProperty('goals');
        expect(Array.isArray(response.payload.goals)).toBe(true);
    });

    it('should handle get_questions message', async () => {
        // Send get_questions request
        client.send(JSON.stringify({
            type: 'get_questions',
            payload: {}
        }));

        // Wait for the response
        const response = await awaitNextMessage(client, (msg) => msg.type === 'questions_response', 10000);

        expect(response.type).toBe('questions_response');
        expect(response.payload).toHaveProperty('questions');
        expect(Array.isArray(response.payload.questions)).toBe(true);
    });

    it('should handle error when requesting unknown message type', async () => {
        // Send an unknown message type
        client.send(JSON.stringify({
            type: 'unknown_message_type',
            payload: {}
        }));

        // Wait for the error response
        const response = await awaitNextMessage(client, (msg) => msg.type === 'error', 10000);

        expect(response.type).toBe('error');
        expect(response.payload.message).toContain('Unknown message type');
    });
});