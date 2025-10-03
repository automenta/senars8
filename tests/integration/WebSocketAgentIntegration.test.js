import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import AgentManager from '../../agent/AgentManager.js';
import {StandaloneWebSocketServer} from '../../agent/StandaloneWebSocketServer.js';
import {awaitNextMessage, closeWebSocket, createWebSocketClient} from '../utils/WebSocketTestUtils.js';
import {findAvailablePort} from '../utils/networkUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';
import {SystemCommands} from '../../core/system/SystemCommands.js';

// Mock the core System to isolate AgentManager and WebSocket communication
vi.mock('../../core/system/System.js', () => {
    const EventEmitter = require('events');
    const {SystemCommands} = require('../../core/system/SystemCommands.js');

    const eventBus = new EventEmitter();

    const commandBus = {
        request: vi.fn(async (command, args) => {
            if (command === SystemCommands.SYSTEM_START_CYCLING) {
                eventBus.emit('status_update', 'running');
            }
            if (command === SystemCommands.SYSTEM_STOP_CYCLING) {
                eventBus.emit('status_update', 'stopped');
            }
            if (command === SystemCommands.SYSTEM_ADD_TASKS) {
                // Call the addTasks method which should emit the event
                addTasks(args);
            }
        }),
        handle: vi.fn(),
    };

    const addTasks = vi.fn((tasks) => {
        tasks.forEach(task => eventBus.emit('add_task', task));
    });

    return {
        default: vi.fn(() => ({
            eventBus,
            commandBus,
            addTasks,
            initialize: vi.fn().mockResolvedValue(undefined),
            start: vi.fn(),
            stop: vi.fn(),
        })),
    };
});

describe('WebSocketAgentIntegration', () => {
    let agentManager;
    let wsServer;
    let wsUrl;
    let controlClient;
    let mockSystem;
    const clientsToClose = [];

    let wsPort;

    beforeAll(async () => {
        wsPort = await findAvailablePort(8081);
        wsUrl = `ws://localhost:${wsPort}`;

        const System = (await import('../../core/system/System.js')).default;
        mockSystem = new System();

        agentManager = new AgentManager();
        // Manually inject the mocked system, as AgentManager creates its own instance.
        agentManager.agent.system = mockSystem;
        agentManager.system = mockSystem;

        wsServer = new StandaloneWebSocketServer(wsPort);
        await wsServer.start();

        agentManager.setBroadcast(wsServer.broadcast.bind(wsServer));

        const messageHandler = createMessageHandler(agentManager);
        wsServer.setMessageHandler(messageHandler);

        // Initialize agent manager to setup event listeners on the mock system
        await agentManager.initialize();
    }, 60000);

    afterAll(async () => {
        if (wsServer) {
            await wsServer.stop();
        }
        if (agentManager) {
            await agentManager.stop();
        }
    }, 30000);

    beforeEach(async () => {
        // A fresh client for each test
        controlClient = await createWebSocketClient(wsUrl);
        clientsToClose.push(controlClient);
        // Clear mock history before each test
        vi.clearAllMocks();

        // The system is mocked and its state is controlled, but re-attaching listeners
        // ensures a clean state for each test run without full re-initialization.
        agentManager.setupEventListeners();
    });

    afterEach(async () => {
        for (const client of clientsToClose) {
            await closeWebSocket(client);
        }
        clientsToClose.length = 0;
    });

    it('should connect and receive a welcome message', async () => {
        const response = await awaitNextMessage(controlClient, (msg) => msg.type === 'connection_ack');
        expect(response.type).toBe('connection_ack');
    });

    it('should start the agent and receive a status_update broadcast', async () => {
        const listenerClient = await createWebSocketClient(wsUrl);
        clientsToClose.push(listenerClient);
        await awaitNextMessage(listenerClient, (msg) => msg.type === 'connection_ack');

        const agentStatePromise = awaitNextMessage(listenerClient, ({type}) => type === 'status_update');

        controlClient.send(JSON.stringify({
            type: 'agentControl',
            payload: {command: 'start'}
        }));

        const agentStateMessage = await agentStatePromise;

        expect(agentStateMessage.type).toBe('status_update');
        expect(agentStateMessage.payload).toBe('running');
        expect(mockSystem.commandBus.request).toHaveBeenCalledWith(SystemCommands.SYSTEM_START_CYCLING, expect.anything());
    });

    it('should add a task and receive a task_added broadcast', async () => {
        const listenerClient = await createWebSocketClient(wsUrl);
        clientsToClose.push(listenerClient);
        await awaitNextMessage(listenerClient, (msg) => msg.type === 'connection_ack');

        const taskAddedPromise = awaitNextMessage(listenerClient, (msg) => msg.type === 'task_added');

        const taskData = {
            // Corrected Narsese syntax
            statement: `(test_task --> relation).`,
        };

        controlClient.send(JSON.stringify({
            type: 'add_task',
            payload: {taskData}
        }));

        const taskAddedMessage = await taskAddedPromise;

        expect(taskAddedMessage.type).toBe('task_added');
        expect(taskAddedMessage.payload.termKey).toBe(taskData.statement);
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
        expect(mockSystem.commandBus.request).toHaveBeenCalledWith(SystemCommands.SYSTEM_STOP_CYCLING);
    });
});