import {describe, it, expect, beforeAll, afterAll, vi} from 'vitest';
import AgentManager from '../../agent/AgentManager.js';
import {StandaloneWebSocketServer} from '../../agent/StandaloneWebSocketServer.js';
import {createWebSocketClient, awaitNextMessage, closeWebSocket} from '../utils/WebSocketTestUtils.js';
import {findAvailablePort} from '../utils/networkUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';

vi.mock('../../core/system/System.js', () => {
    const EventEmitter = vi.fn(() => ({
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    }));
    const CommandBus = vi.fn(() => ({
        handle: vi.fn(),
        request: vi.fn(),
    }));

    return {
        default: vi.fn(() => ({
            eventBus: new EventEmitter(),
            commandBus: new CommandBus(),
            initialize: vi.fn().mockResolvedValue(undefined),
            start: vi.fn(),
            stop: vi.fn(),
            addTasks: vi.fn(),
        })),
    };
});

describe('WebSocket Full Lifecycle Integration Test', () => {
    let agentManager;
    let wsServer;
    let wsUrl;
    let controlClient;
    let mockSystem;
    const clientsToClose = [];

    beforeEach(async () => {
        const wsPort = await findAvailablePort(8081);
        wsUrl = `ws://localhost:${wsPort}`;

        const System = (await import('../../core/system/System.js')).default;
        mockSystem = new System();
        agentManager = new AgentManager(mockSystem);
        wsServer = new StandaloneWebSocketServer(wsPort);

        await wsServer.start();

        agentManager.setBroadcast(wsServer.broadcast.bind(wsServer));

        const messageHandler = createMessageHandler(agentManager);
        wsServer.setMessageHandler(messageHandler);

        await agentManager.initialize();

        controlClient = await createWebSocketClient(wsUrl);
        clientsToClose.push(controlClient);

        // Clear any previous mock calls before each test
        vi.clearAllMocks();
    });

    afterEach(async () => {
        for (const client of clientsToClose) {
            await closeWebSocket(client);
        }
        clientsToClose.length = 0; // Clear the array
        await wsServer.stop();
        await agentManager.stop();
    });

    it('should connect and receive a welcome message', async () => {
        const response = await awaitNextMessage(controlClient, (msg) => msg.type === 'connection_ack');
        expect(response.type).toBe('connection_ack');
    });

    it('should start the agent and receive a status_update broadcast', async () => {
        const listenerClient = await createWebSocketClient(wsUrl);
        clientsToClose.push(listenerClient);
        await awaitNextMessage(listenerClient, (msg) => msg.type === 'connection_ack');

        const agentStatePromise = awaitNextMessage(listenerClient, ({ type }) => type === 'status_update');

        controlClient.send(JSON.stringify({
            type: 'agentControl',
            payload: {command: 'start'}
        }));

        const agentStateMessage = await agentStatePromise;

        expect(agentStateMessage.type).toBe('status_update');
        expect(agentStateMessage.payload).toBe('running');
        expect(mockSystem.start).toHaveBeenCalled();
    });

    it('should add a task and receive a task_added broadcast', async () => {
        const listenerClient = await createWebSocketClient(wsUrl);
        clientsToClose.push(listenerClient);
        await awaitNextMessage(listenerClient, (msg) => msg.type === 'connection_ack');

        const taskAddedPromise = awaitNextMessage(listenerClient, (msg) => msg.type === 'task_added');

        const taskData = {
            statement: `<test-task-${Date.now()} --> relation>.`,
        };

        controlClient.send(JSON.stringify({
            type: 'add_task',
            payload: {taskData}
        }));

        const taskAddedMessage = await taskAddedPromise;

        expect(taskAddedMessage.type).toBe('task_added');
        expect(taskAddedMessage.payload.statement).toBe(taskData.statement);
        expect(mockSystem.addTasks).toHaveBeenCalled();
    });

    it('should stop the agent and receive a status_update broadcast', async () => {
        const listenerClient = await createWebSocketClient(wsUrl);
        clientsToClose.push(listenerClient);
        await awaitNextMessage(listenerClient, (msg) => msg.type === 'connection_ack');

        const agentStatePromise = awaitNextMessage(listenerClient, (msg) => msg.type === 'status_update');

        controlClient.send(JSON.stringify({
            type: 'agentControl',
            payload: {command: 'stop'}
        }));

        const agentStateMessage = await agentStatePromise;

        expect(agentStateMessage.type).toBe('status_update');
        expect(agentStateMessage.payload).toBe('stopped');
        expect(mockSystem.stop).toHaveBeenCalled();
    });
});