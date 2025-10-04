import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import AgentManager from '../../agent/AgentManager.js';
import {WebSocketManager} from '../../agent/WebSocketManager.js';
import {awaitNextMessage, closeWebSocket, createWebSocketClient} from '../utils/WebSocketTestUtils.js';
import {findAvailablePort} from '../utils/networkUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';
import {SystemCommands} from '../../core/system/SystemCommands.js';
import {SystemEvents} from '../../core/system/SystemEvents.js';

vi.mock('../../core/system/System.js', () => {
    const EventEmitter = require('events');

    // Create a real EventEmitter instance for proper event handling
    const eventBus = new EventEmitter();

    const commandBus = {
        handle: vi.fn(),
        request: vi.fn(async (command, args) => {
            if (command === SystemCommands.SYSTEM_START_CYCLING) {
                // Emit the status update event to be caught by agent manager's listeners
                eventBus.emit('status_update', 'running');
            }
            if (command === SystemCommands.SYSTEM_STOP_CYCLING) {
                eventBus.emit('status_update', 'stopped');
            }
            if (command === SystemCommands.SYSTEM_ADD_TASKS) {
                eventBus.emit(SystemEvents.TASKS_ADD, args);
            }
        }),
    };

    return {
        default: vi.fn(() => ({
            eventBus,
            commandBus,
            initialize: vi.fn().mockResolvedValue(undefined),
            start: vi.fn(),
            stop: vi.fn(),
        })),
    };
});

describe('WebSocket Full Lifecycle Integration Test', () => {
    let agentManager;
    let wsManager;
    let wsUrl;
    let controlClient;
    let mockSystem;
    let wsPort;
    const clientsToClose = [];

    beforeEach(async () => {
        wsPort = await findAvailablePort(8083); // Use a different port to avoid conflicts with other tests
        wsUrl = `ws://localhost:${wsPort}`;

        const System = (await import('../../core/system/System.js')).default;
        mockSystem = new System();
        agentManager = new AgentManager();
        // Manually inject the mocked system since AgentManager creates its own by default
        agentManager.system = mockSystem;
        agentManager.agent.system = mockSystem;
        wsManager = new WebSocketManager({port: wsPort});

        await wsManager.start();

        agentManager.setBroadcast(wsManager.broadcast.bind(wsManager));

        const messageHandler = createMessageHandler(agentManager);
        wsManager.setMessageHandler(messageHandler);

        await agentManager.initialize();

        // Ensure event listeners are properly set up after initialization
        agentManager.setupEventListeners();

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
        if (wsManager) {
            await wsManager.stop();
        }
        if (agentManager) {
            await agentManager.stop();
        }
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
            statement: '(test_task --> relation).',
        };

        controlClient.send(JSON.stringify({
            type: 'add_task',
            payload: {taskData}
        }));

        const taskAddedMessage = await taskAddedPromise;

        expect(taskAddedMessage.type).toBe('task_added');
        expect(taskAddedMessage.payload.termKey).toBe(taskData.statement);
        expect(mockSystem.commandBus.request).toHaveBeenCalledWith(SystemCommands.SYSTEM_ADD_TASKS, expect.any(Array));
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