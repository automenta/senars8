import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ServerProcessManager } from '../utils/ServerProcessManager.js';
import { createWebSocketClient, awaitNextMessage, closeWebSocket } from '../utils/WebSocketTestUtils.js';

describe('WebSocket Full Lifecycle Integration Test', () => {
    const serverManager = new ServerProcessManager();
    let wsUrl;
    let controlClient;
    let clientsToClose = [];

    beforeAll(async () => {
        const httpPort = await serverManager.findAvailablePort(8080);
        const wsPort = await serverManager.findAvailablePort(httpPort + 1);
        wsUrl = `ws://localhost:${wsPort}`;
        await serverManager.startServer(httpPort, wsPort);
        controlClient = await createWebSocketClient(wsUrl);
        clientsToClose.push(controlClient);
    }, 60000);

    afterAll(async () => {
        clientsToClose.forEach(closeWebSocket);
        await serverManager.stopServer();
    }, 30000);

    it('should connect and receive a welcome message', async () => {
        const response = await awaitNextMessage(controlClient);
        expect(response.type).toBe('connection_ack');
    });

    it('should start the agent and receive a status_update broadcast', async () => {
        const listenerClient = await createWebSocketClient(wsUrl);
        clientsToClose.push(listenerClient);
        await awaitNextMessage(listenerClient); // Consume listener's ack

        const agentStatePromise = awaitNextMessage(listenerClient, 5000);

        controlClient.send(JSON.stringify({
            type: 'agentControl',
            payload: { command: 'start' }
        }));

        const agentStateMessage = await agentStatePromise;

        // Based on AgentManager, the event is 'status_update'
        expect(agentStateMessage.type).toBe('status_update');
        expect(agentStateMessage.payload).toBe('running');
    });

    it('should add a task and receive a task_added broadcast', async () => {
        const listenerClient = await createWebSocketClient(wsUrl);
        clientsToClose.push(listenerClient);
        await awaitNextMessage(listenerClient); // Consume listener's ack

        const taskAddedPromise = awaitNextMessage(listenerClient, 5000);

        const taskData = {
            statement: `<test-task-${Date.now()} --> relation>.`,
        };

        controlClient.send(JSON.stringify({
            type: 'add_task',
            payload: { taskData }
        }));

        const taskAddedMessage = await taskAddedPromise;

        expect(taskAddedMessage.type).toBe('task_added');
        expect(taskAddedMessage.payload.task).toContain(taskData.statement);
    });

    it('should stop the agent and receive a status_update broadcast', async () => {
        const listenerClient = await createWebSocketClient(wsUrl);
        clientsToClose.push(listenerClient);
        await awaitNextMessage(listenerClient);

        const agentStatePromise = awaitNextMessage(listenerClient, 5000);

        controlClient.send(JSON.stringify({
            type: 'agentControl',
            payload: { command: 'stop' }
        }));

        const agentStateMessage = await agentStatePromise;

        expect(agentStateMessage.type).toBe('status_update');
        expect(agentStateMessage.payload).toBe('stopped');
    });
});