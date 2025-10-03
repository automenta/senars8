import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import AgentManager from '../../agent/AgentManager.js';
import {StandaloneWebSocketServer} from '../../agent/StandaloneWebSocketServer.js';
import {awaitNextMessage, closeWebSocket, createWebSocketClient} from '../utils/WebSocketTestUtils.js';
import {findAvailablePort} from '../utils/networkUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';

describe('TUI WebSocket Service Integration', () => {
    let agentManager;
    let wsServer;
    let wsUrl;
    let tuiClient;
    let wsPort;

    beforeAll(async () => {
        wsPort = await findAvailablePort(8082); // Use a different port to avoid conflicts
        wsUrl = `ws://localhost:${wsPort}`;

        // Instantiate and wire up components
        agentManager = new AgentManager();
        wsServer = new StandaloneWebSocketServer(wsPort);

        await wsServer.start();

        // Link server to agent manager
        agentManager.setBroadcast(wsServer.broadcast.bind(wsServer));

        // Create and set message handler
        const messageHandler = createMessageHandler(agentManager, wsServer.broadcast.bind(wsServer));
        wsServer.setMessageHandler(messageHandler);

        // Initialize agent manager
        await agentManager.initialize();

        // Create a client for the TUI
        tuiClient = await createWebSocketClient(wsUrl);
    }, 60000);

    afterAll(async () => {
        if (tuiClient) {
            await closeWebSocket(tuiClient);
        }
        if (wsServer) {
            await wsServer.stop();
        }
        if (agentManager) {
            await agentManager.stop();
        }
    }, 30000);

    it('should handle bidirectional communication between TUI and agent', async () => {
        // 1. Wait for the initial connection acknowledgment
        const ack = await awaitNextMessage(tuiClient, (msg) => msg.type === 'connection_ack');
        expect(ack.type).toBe('connection_ack');

        // 2. Prepare to receive a broadcast message after sending a task
        const taskAddedPromise = awaitNextMessage(tuiClient, (msg) => msg.type === 'task_added', 5000);

        // 3. Send a task from the TUI client to the agent
        const taskData = {
            statement: `<tui_task --> relation>.`,
        };
        tuiClient.send(JSON.stringify({
            type: 'add_task',
            payload: {taskData}
        }));

        // 4. Wait for the broadcast and verify its content
        const taskAddedMessage = await taskAddedPromise;
        expect(taskAddedMessage.type).toBe('task_added');
        expect(taskAddedMessage.payload.termKey).toBe(taskData.statement);
    });
});