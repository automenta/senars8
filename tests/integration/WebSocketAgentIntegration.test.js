import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import {createMessageHandler} from '../../agent/MessageHandler.js';
import {SystemCommands} from '../../core/system/SystemCommands.js';
import WebSocket from 'ws';


// Mock the core index to provide agentErrorHandler and createSystem
vi.mock('../../core/index.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        createSystem: vi.fn().mockResolvedValue({
            eventBus: {on: vi.fn(), off: vi.fn(), emit: vi.fn()},
            memory: {
                getAllTasks: vi.fn().mockReturnValue([]),
                getBeliefs: vi.fn().mockReturnValue([]),
                getGoals: vi.fn().mockReturnValue([]),
                getQuestions: vi.fn().mockReturnValue([]),
            },
            commandBus: {request: vi.fn()},
            stop: vi.fn(),
        }),
        agentErrorHandler: {
            execute: vi.fn((fn) => fn()),
            runSync: vi.fn((fn) => fn()),
        },
    };
});

// Mock Task constructor
vi.mock('../../core/core/Task.js', () => {
    return {
        default: vi.fn().mockImplementation((term, punctuation, options) => ({
            id: `task_${Date.now()}`,
            termKey: term,
            punctuation,
            state: {
                priority: options?.priority || 0.5,
                truthValue: options?.truthValue || {frequency: 0.5, confidence: 0.5},
                occurrenceTime: Date.now()
            },
            stamp: {
                creationTime: Date.now()
            }
        }))
    };
});

// Mock formatTaskForBroadcast function
vi.mock('../../agent/utils/taskUtils.js', () => ({
    formatTaskForBroadcast: vi.fn().mockImplementation((task) => ({
        id: task.id,
        termKey: task.termKey,
        punctuation: task.punctuation,
        priority: task.state?.priority || 0,
        truthValue: task.state?.truthValue || {frequency: 0.5, confidence: 0.5},
        occurrenceTime: task.state?.occurrenceTime || null,
        creationTime: task.stamp?.creationTime || Date.now()
    }))
}));

describe('WebSocketAgentIntegration', () => {
    let wsManager;
    let agentManager;
    let mockSystem;
    let port;
    let wss;
    let messageHandler;

    beforeAll(async () => {
        port = 8201; // Use different port to avoid conflicts

        // Create WebSocket manager
        const {WebSocketManager} = await import('../../agent/WebSocketManager.js');
        wsManager = new WebSocketManager({port});
        await wsManager.start();

        // Create agent manager with broadcast function
        const AgentManager = (await import('../../agent/AgentManager.js')).default;
        agentManager = new AgentManager();
        agentManager.setBroadcast(wsManager.broadcast.bind(wsManager));

        // Create message handler with debugging
        const originalCreateMessageHandler = createMessageHandler(agentManager, wsManager.broadcast.bind(wsManager));
        messageHandler = async (message, ws) => {
            console.log('Message handler called with:', message.toString());
            try {
                const parsedMessage = JSON.parse(message.toString());
                console.log('Parsed message:', parsedMessage);

                if (parsedMessage.type === 'agentControl') {
                    console.log('Calling handleAgentControl...');
                    const {handleAgentControl} = await import('../../agent/api/agent.js');
                    await handleAgentControl(parsedMessage.payload, ws, agentManager, wsManager.broadcast.bind(wsManager));
                    console.log('handleAgentControl completed for command:', parsedMessage.payload.command);
                } else if (parsedMessage.type === 'add_task') {
                    console.log('Calling handleAddTask...');
                    const {handleAddTask} = await import('../../agent/api/agent.js');
                    await handleAddTask(parsedMessage.payload, ws, agentManager.agent, wsManager.broadcast.bind(wsManager));
                    console.log('handleAddTask completed');
                } else {
                    console.log('Calling original handler for type:', parsedMessage.type);
                    await originalCreateMessageHandler(message, ws);
                }
            } catch (error) {
                console.error('Error in message handler:', error);
            }
            console.log('Message handler completed');
        };
        wsManager.setMessageHandler(messageHandler);

        // Create mock system with proper event emission
        const EventEmitter = require('events');
        const eventBus = new EventEmitter();

        // Create a complete mock system instead of using the real System constructor
        mockSystem = {
            eventBus,
            commandBus: {
                request: vi.fn(async (command, args) => {
                    if (command === SystemCommands.SYSTEM_START_CYCLING) {
                        // Emit status_update event that AgentManager listens for
                        setTimeout(() => eventBus.emit('status_update', {status: 'running'}), 10);
                        return {success: true};
                    }
                    if (command === SystemCommands.SYSTEM_STOP_CYCLING) {
                        // Emit status_update event that AgentManager listens for
                        console.log('Emitting status_update event for stop command');
                        eventBus.emit('status_update', {status: 'stopped'});
                        return {success: true};
                    }
                    if (command === SystemCommands.SYSTEM_ADD_TASKS) {
                        // Emit tasks:add event that AgentManager listens for
                        setTimeout(() => eventBus.emit('tasks:add', args), 10);
                        return {success: true};
                    }
                    return {success: true};
                }),
                handle: vi.fn(),
            },
            memory: {
                getAllTasks: vi.fn().mockReturnValue([]),
                getBeliefs: vi.fn().mockReturnValue([]),
                getGoals: vi.fn().mockReturnValue([]),
                getQuestions: vi.fn().mockReturnValue([]),
            },
            stop: vi.fn(),
        };

        // Inject mock system into agent manager
        agentManager.agent.system = mockSystem;
        agentManager.system = mockSystem;

        // Set up event listeners on the agent manager - this should listen to the same event bus
        agentManager.setupEventListeners();

        // Verify that the event listeners are set up correctly
        console.log('Event listeners set up:', !!agentManager._statusUpdateListener);

        console.log('✅ WebSocket integration test setup complete');
    }, 5000);

    afterAll(async () => {
        if (wsManager) {
            await wsManager.stop();
        }
        if (agentManager) {
            await agentManager.stop();
        }
    }, 5000);

    beforeEach(() => {
        vi.clearAllMocks();
    });


    it('should start the agent and receive a status_update broadcast', async () => {
        // Create two WebSocket clients
        const controlClient = new WebSocket(`ws://localhost:${port}`);
        const listenerClient = new WebSocket(`ws://localhost:${port}`);

        // Wait for both clients to connect
        await Promise.all([
            new Promise(resolve => controlClient.on('open', resolve)),
            new Promise(resolve => listenerClient.on('open', resolve))
        ]);

        // Listen for status update on listener client
        const statusResponse = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                controlClient.close();
                listenerClient.close();
                console.log('Command bus call count:', mockSystem.commandBus.request.mock.calls.length);
                console.log('Command bus calls:', mockSystem.commandBus.request.mock.calls);
                reject(new Error('Did not receive status_update within timeout'));
            }, 1000);

            listenerClient.on('message', (data) => {
                const message = JSON.parse(data);
                console.log('Received message:', message);
                if (message.type === 'status_update') {
                    clearTimeout(timeout);
                    resolve(message);
                }
            });

            // Send start command
            console.log('Sending start command...');
            controlClient.send(JSON.stringify({
                type: 'agentControl',
                payload: {command: 'start'}
            }));
        });

        expect(statusResponse.type).toBe('status_update');
        expect(statusResponse.payload).toEqual({status: 'running'});
        expect(mockSystem.commandBus.request).toHaveBeenCalledWith(SystemCommands.SYSTEM_START_CYCLING, expect.anything());

        controlClient.close();
        listenerClient.close();
    });

    it('should add a task and receive a task_added broadcast', async () => {
        // Create two WebSocket clients
        const controlClient = new WebSocket(`ws://localhost:${port}`);
        const listenerClient = new WebSocket(`ws://localhost:${port}`);

        // Wait for both clients to connect
        await Promise.all([
            new Promise(resolve => controlClient.on('open', resolve)),
            new Promise(resolve => listenerClient.on('open', resolve))
        ]);

        // Listen for task added event
        const taskResponse = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                controlClient.close();
                listenerClient.close();
                reject(new Error('Did not receive task_added within timeout'));
            }, 1000);

            listenerClient.on('message', (data) => {
                const message = JSON.parse(data);
                if (message.type === 'task_added') {
                    clearTimeout(timeout);
                    resolve(message);
                }
            });

            // Send add task command
            controlClient.send(JSON.stringify({
                type: 'add_task',
                payload: {taskData: {termKey: '(test_task --> relation).'}}
            }));
        });

        expect(taskResponse.type).toBe('task_added');
        expect(mockSystem.commandBus.request).toHaveBeenCalledWith(SystemCommands.SYSTEM_ADD_TASKS, expect.any(Array));

        controlClient.close();
        listenerClient.close();
    });

    it('should stop the agent and receive a status_update broadcast', async () => {
        // Create two WebSocket clients
        const controlClient = new WebSocket(`ws://localhost:${port}`);
        const listenerClient = new WebSocket(`ws://localhost:${port}`);

        // Wait for both clients to connect
        await Promise.all([
            new Promise(resolve => controlClient.on('open', resolve)),
            new Promise(resolve => listenerClient.on('open', resolve))
        ]);

        // Listen for status update
        const statusResponse = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                controlClient.close();
                listenerClient.close();
                reject(new Error('Did not receive status_update within timeout'));
            }, 1000);

            listenerClient.on('message', (data) => {
                const message = JSON.parse(data);
                if (message.type === 'status_update') {
                    clearTimeout(timeout);
                    resolve(message);
                }
            });

            // Send stop command
            controlClient.send(JSON.stringify({
                type: 'agentControl',
                payload: {command: 'stop'}
            }));
        });

        expect(statusResponse.type).toBe('status_update');
        expect(statusResponse.payload).toEqual({status: 'stopped'});
        expect(mockSystem.commandBus.request).toHaveBeenCalledWith(SystemCommands.SYSTEM_STOP_CYCLING);

        controlClient.close();
        listenerClient.close();
    });

    it('should handle multiple clients efficiently', async () => {
        // Create multiple clients in parallel for better performance
        const clients = await Promise.all([
            new Promise(resolve => {
                const client = new WebSocket(`ws://localhost:${port}`);
                client.on('open', () => resolve(client));
            }),
            new Promise(resolve => {
                const client = new WebSocket(`ws://localhost:${port}`);
                client.on('open', () => resolve(client));
            }),
            new Promise(resolve => {
                const client = new WebSocket(`ws://localhost:${port}`);
                client.on('open', () => resolve(client));
            })
        ]);

        expect(clients).toHaveLength(3);

        // Test that all clients are properly connected
        clients.forEach(client => {
            expect(client.readyState).toBe(WebSocket.OPEN);
        });

        // Clean up
        clients.forEach(client => client.close());
    });
});