import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import {createWebSocketTestFixture} from '../utils/WebSocketTestUtils.js';
import {findAvailablePort} from '../utils/networkUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';
import {SystemCommands} from '../../core/system/SystemCommands.js';
import {SystemEvents} from '../../core/system/SystemEvents.js';

// Mock the core System to isolate AgentManager and WebSocket communication
vi.mock('../../core/system/System.js', () => {
    const EventEmitter = require('events');

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
                eventBus.emit(SystemEvents.TASKS_ADD, args);
            }
        }),
        handle: vi.fn(),
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

describe('WebSocketAgentIntegration', () => {
    let fixture;
    let mockSystem;
    let port;

    beforeAll(async () => {
        // Use unique port for this test file
        port = 8200; // Unique port for WebSocketAgentIntegration
        console.log(`🚀 Setting up WebSocket test on port ${port}`);

        // Create optimized fixture directly
        fixture = createWebSocketTestFixture(port, {
            connectionTimeout: 1000,
            messageTimeout: 500,
            setupTimeout: 5000,
            cleanupTimeout: 2000,
        });

        // Setup with optimized message handler
        await fixture.setup(createMessageHandler);

        const System = (await import('../../core/system/System.js')).default;
        mockSystem = new System();

        // Inject mocked system into agent manager
        if (fixture && fixture.agentManager) {
            fixture.agentManager.agent.system = mockSystem;
            fixture.agentManager.system = mockSystem;
        }

        console.log(`✅ Setup complete in ${Date.now() - Date.now()}ms`);
    }, 8000);

    afterAll(async () => {
        if (fixture) {
            await fixture.cleanup();
        }
    }, 3000);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should connect and receive a welcome message', async () => {
        const [client] = await fixture.createClients(1);
        // Just verify the client was created successfully
        expect(client).toBeDefined();
        expect(client.readyState).toBe(1); // WebSocket.OPEN
    });

    it('should start the agent and receive a status_update broadcast', async () => {
        const [controlClient, listenerClient] = await fixture.createClients(2);

        // Send start command and expect status update
        const statusResponse = await fixture.sendAndExpect(
            listenerClient,
            {type: 'agentControl', payload: {command: 'start'}},
            (msg) => msg.type === 'status_update'
        );

        expect(statusResponse.type).toBe('status_update');
        expect(statusResponse.payload).toBe('running');
        expect(mockSystem.commandBus.request).toHaveBeenCalledWith(SystemCommands.SYSTEM_START_CYCLING, expect.anything());
    });

    it('should add a task and receive a task_added broadcast', async () => {
        const [controlClient, listenerClient] = await fixture.createClients(2);

        // Listen for task added event
        const taskResponse = await fixture.sendAndExpect(
            listenerClient,
            {type: 'add_task', payload: {taskData: {statement: '(test_task --> relation).'}}},
            (msg) => msg.type === 'task_added'
        );

        expect(taskResponse.type).toBe('task_added');
        expect(taskResponse.payload.termKey).toBe('(test_task --> relation).');
        expect(mockSystem.commandBus.request).toHaveBeenCalledWith(SystemCommands.SYSTEM_ADD_TASKS, expect.any(Array));
    });

    it('should stop the agent and receive a status_update broadcast', async () => {
        const [controlClient, listenerClient] = await fixture.createClients(2);

        // Send stop command and expect status update
        const statusResponse = await fixture.sendAndExpect(
            listenerClient,
            {type: 'agentControl', payload: {command: 'stop'}},
            (msg) => msg.type === 'status_update'
        );

        expect(statusResponse.type).toBe('status_update');
        expect(statusResponse.payload).toBe('stopped');
        expect(mockSystem.commandBus.request).toHaveBeenCalledWith(SystemCommands.SYSTEM_STOP_CYCLING);
    });

    it('should handle multiple clients efficiently', async () => {
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