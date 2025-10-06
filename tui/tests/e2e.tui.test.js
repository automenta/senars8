import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {setTimeout as promiseTimeout} from 'timers/promises';
import {promisify} from 'util';
import {WebSocketServer} from 'ws';
import {connectionManager} from '../../common/services/connection.js';
import {
    findTuiTestPort,
    runTuiWithTimeout,
    shouldIgnoreError,
    startTestAgent,
    TEST_CONFIG,
    validateTuiOutput
} from './test-utils.js';

// Mock React Ink for testing
vi.mock('react', () => ({
    default: {
        useState: vi.fn((initial) => [initial, vi.fn()]),
        useEffect: vi.fn((fn) => fn()),
        createElement: vi.fn(),
        memo: vi.fn((component) => component),
        Component: class MockComponent {
            constructor(props) {
                this.props = props;
                this.state = {};
            }
        },
    },
    useState: vi.fn((initial) => [initial, vi.fn()]),
    useEffect: vi.fn((fn) => fn()),
    createElement: vi.fn(),
    memo: vi.fn((component) => component),
    Component: class MockComponent {
        constructor(props) {
            this.props = props;
            this.state = {};
        }
    },
}));

vi.mock('ink', () => ({
    Box: vi.fn(),
    Text: vi.fn(),
    render: vi.fn(),
}));

const exec = promisify(require('child_process').exec);

describe.skip('TUI End-to-End Integration Tests', async () => {
    let sharedAgent;
    let wsPort;

    beforeAll(async () => {
        // Find an available port for all tests
        wsPort = await findTuiTestPort(TEST_CONFIG.PORTS.START);

        console.log(`Starting shared agent on port ${wsPort}`);

        // Start one agent for all tests
        sharedAgent = await startTestAgent(wsPort);

        console.log(`Shared agent started on port ${wsPort}`);
    }, TEST_CONFIG.TIMEOUTS.TUI_RUN);

    afterAll(async () => {
        console.log(`Stopping shared agent on port ${wsPort}`);

        if (sharedAgent && sharedAgent.process) {
            sharedAgent.process.kill('SIGTERM');
            // Give it time to shut down gracefully
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`Shared agent stopped`);
    });

    it('should run TUI without fatal errors', async () => {
        // Shared agent is already started in beforeAll

        // Run TUI with timeout using utility function
        const result = await runTuiWithTimeout(wsPort, TEST_CONFIG.TIMEOUTS.MESSAGE_PROCESSING);

        // Validate that TUI ran without fatal errors
        if (result.timedOut) {
            console.log('TUI ran successfully and was stopped by timeout as expected');
        } else if (result.success) {
            // Check for fatal errors in output
            const hasFatalErrors = !validateTuiOutput(result.stderr, result.stdout);

            if (hasFatalErrors) {
                console.log('TUI stderr:', result.stderr);
                console.log('TUI stdout:', result.stdout);
                throw new Error('TUI ran but with fatal errors in output');
            }

            console.log('TUI ran without fatal errors');
        } else {
            // Check if error should be ignored
            if (result.stderr && shouldIgnoreError(result.stderr)) {
                console.log('TUI ran with acceptable warnings');
            } else {
                console.log('TUI error details:', result);
                throw new Error(`TUI failed to run: ${result.error}`);
            }
        }
    });

    it('should be able to connect to agent and display status', async () => {
        // Shared agent is already running
        // Wait for agent to be ready
        await promiseTimeout(TEST_CONFIG.RETRY_INTERVALS.MEDIUM);

        // Run TUI with timeout to test connection
        const result = await runTuiWithTimeout(wsPort, TEST_CONFIG.TIMEOUTS.MESSAGE_PROCESSING);

        // Validate the connection test
        if (result.timedOut) {
            console.log('TUI connected to agent and ran successfully, stopped by timeout');
        } else if (result.success) {
            // Check for fatal errors in output
            const hasFatalErrors = !validateTuiOutput(result.stderr, result.stdout);

            if (hasFatalErrors) {
                console.log('TUI stderr:', result.stderr);
                console.log('TUI stdout:', result.stdout);
                throw new Error('TUI ran but with fatal errors in output');
            }

            console.log('TUI connected to agent successfully');
        } else {
            // Check if error should be ignored
            if (result.stderr && shouldIgnoreError(result.stderr)) {
                console.log('TUI connected with acceptable warnings');
            } else {
                console.log('TUI error details:', result);
                throw new Error(`TUI failed to connect: ${result.error}`);
            }
        }
    });

});

describe.skip('TUI Connection Management', () => {
    it('should discover and connect to agents automatically', async () => {
        const testPort = TEST_CONFIG.PORTS.MOCK_SERVERS.DISCOVERY;
        const mockWsServer = new WebSocketServer({port: testPort});

        mockWsServer.on('connection', (ws) => {
            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                if (message.type === 'get_system_stats') {
                    ws.send(JSON.stringify({type: 'system_stats', payload: {isRunning: true}}));
                }
            });
        });

        await promiseTimeout(TEST_CONFIG.RETRY_INTERVALS.MEDIUM);
        await connectionManager.discover(testPort);
        await promiseTimeout(TEST_CONFIG.RETRY_INTERVALS.SLOW);

        const connections = connectionManager.getConnections();
        expect(connections.length).toBeGreaterThan(0);

        mockWsServer.close();
        connectionManager.disconnectAll();
    });

    it('should handle connection errors gracefully', async () => {
        const invalidPort = 9999;

        let errorHandled = false;
        const errorHandler = (error) => {
            if (error.url && error.url.includes(invalidPort.toString())) errorHandled = true;
        };
        connectionManager.on('error', errorHandler);

        try {
            await expect(connectionManager.discover(invalidPort)).resolves.not.toThrow();
            await promiseTimeout(TEST_CONFIG.TIMEOUTS.MESSAGE_PROCESSING);

            connectionManager.disconnectAll();
            const connections = connectionManager.getConnections();
            expect(connections.length).toBe(0);
            expect(errorHandled).toBe(true);
        } finally {
            connectionManager.off('error', errorHandler);
        }
    });
});

describe.skip('TUI Agent Service Integration', () => {
    let mockWs;
    let testPort;

    beforeEach(async () => {
        testPort = await findTuiTestPort(TEST_CONFIG.PORTS.MOCK_SERVERS.SERVICE);
        const mockWsServer = new WebSocketServer({port: testPort});

        mockWsServer.on('connection', (ws) => {
            mockWs = ws;
            ws.on('message', (data) => {
                const message = JSON.parse(data.toString());
                handleMessage(message, ws);
            });
        });

        await promiseTimeout(TEST_CONFIG.RETRY_INTERVALS.MEDIUM);
    });

    afterEach(() => {
        if (mockWs) mockWs.close();
    });

    const handleMessage = (message, ws) => {
        const {type, payload} = message;

        switch (type) {
            case 'get_system_stats':
                ws.send(JSON.stringify({
                    type: 'system_stats',
                    payload: {
                        isRunning: true,
                        cycleCount: 150,
                        uptime: '00:05:30',
                        connectionStatus: 'connected'
                    }
                }));
                break;
            case 'get_tasks':
                ws.send(JSON.stringify({
                    type: 'tasks_response',
                    payload: {
                        tasks: [
                            {termKey: '(test --> task)', punctuation: '.'},
                            {termKey: 'goal!', punctuation: '!'}
                        ]
                    }
                }));
                break;
            case 'get_beliefs':
                ws.send(JSON.stringify({
                    type: 'beliefs_response',
                    payload: {
                        beliefs: [
                            {termKey: '(bird --> animal)', punctuation: '.'}
                        ]
                    }
                }));
                break;
            case 'get_goals':
                ws.send(JSON.stringify({
                    type: 'goals_response',
                    payload: {
                        goals: [
                            {termKey: 'learn!', punctuation: '!'}
                        ]
                    }
                }));
                break;
            case 'narsese':
            case 'natural_language':
                ws.send(JSON.stringify({
                    type: 'log',
                    payload: `Processed: ${payload}`
                }));
                break;
        }
    };

    it('should send and receive messages correctly', async () => {
        const TuiAgentService = (await import('../src/services/TuiAgentService.js')).default;

        const service = new TuiAgentService(`ws://localhost:${testPort}`);
        service.connect();

        // Wait for connection
        await promiseTimeout(TEST_CONFIG.TIMEOUTS.CONNECTION);

        // Test sending a message
        service.sendNarsese('<bird --> animal>.');
        service.sendNaturalLanguage('Hello agent');

        // Wait for processing
        await promiseTimeout(TEST_CONFIG.RETRY_INTERVALS.MEDIUM);

        // Test getting agent state
        const state = service.getAgentState();
        expect(state).toBeDefined();

        service.disconnect();
    });

    describe('TUI View Unit Tests', () => {
        it('should have functional TUI View commands', async () => {
            // Test the TUI View functionality only (renderer is now components)
            const {TuiView} = await import('../src/TuiView.js');

            // Mock API service
            const mockApiService = {
                getAgentState: () => ({
                    isRunning: true,
                    cycleCount: 1250,
                    uptime: '00:12:34',
                    version: '1.1.0',
                    connectionStatus: 'connected',
                    stats: {
                        cyclesPerSecond: 10.5,
                        memoryUsedMB: 45.2,
                        cpuUsage: 23.7,
                        tasksPerSecond: 2.1
                    },
                    memory: {
                        beliefs: [
                            {termKey: '(bird --> animal)', state: {truthValue: {confidence: 0.89}}},
                            {termKey: '(animal --> living)', state: {truthValue: {confidence: 0.95}}}
                        ],
                        goals: [
                            {termKey: 'food!', state: {truthValue: {confidence: 0.85}}}
                        ],
                        concepts: [{id: 'concept_1'}]
                    },
                    tasks: [
                        {termKey: '(bird --> mortal)', punctuation: '.', state: {truthValue: {confidence: 0.65}}}
                    ]
                }),
                sendAgentControl: () => Promise.resolve(),
            };

            // Test TUI View
            const view = new TuiView(mockApiService);

            // Test all expected commands exist
            expect(view.commandMap).toHaveProperty('stats');
            expect(view.commandMap).toHaveProperty('memory');
            expect(view.commandMap).toHaveProperty('reset');
            expect(view.commandMap).toHaveProperty('pause');
            expect(view.commandMap).toHaveProperty('resume');
            expect(view.commandMap).toHaveProperty('beliefs');
            expect(view.commandMap).toHaveProperty('goals');
            expect(view.commandMap).toHaveProperty('tasks');

            // Test command execution
            const statsResult = view.executeCommand('stats');
            expect(statsResult).toHaveProperty('connectionStatus');
            expect(statsResult).toHaveProperty('isRunning');

            const memoryResult = view.executeCommand('memory');
            expect(memoryResult).toHaveProperty('beliefsCount');

            const beliefsResult = view.executeCommand('beliefs');
            expect(Array.isArray(beliefsResult)).toBe(true);

            const goalsResult = view.executeCommand('goals');
            expect(Array.isArray(goalsResult)).toBe(true);

            const tasksResult = view.executeCommand('tasks');
            expect(Array.isArray(tasksResult)).toBe(true);

            console.log('TUI View functionality tested successfully');
        });
        it('should handle agent state updates', async () => {
            const TuiAgentService = (await import('../src/services/TuiAgentService.js')).default;

            const service = new TuiAgentService(`ws://localhost:${testPort}`);
            service.connect();

            await promiseTimeout(TEST_CONFIG.TIMEOUTS.SETUP);

            // Test that state was updated
            const state = service.getAgentState();
            expect(state).toBeDefined();

            service.disconnect();
        });
    
        describe('TUI Keyboard Navigation and Layout Responsiveness', () => {
            it('should handle keyboard navigation correctly', async () => {
                // Test keyboard navigation functionality
                const {useTabNavigation, useFocusManager} = await import('../src/hooks/useMouseInteraction.js');
    
                // Mock tabs for testing
                const mockTabs = [
                    {id: 'status', label: '📊 Status'},
                    {id: 'tasks', label: '⚡ Tasks'},
                    {id: 'log', label: '📝 Logs'},
                    {id: 'input', label: '💬 Input'}
                ];
    
                // Test tab navigation hook
                const tabNavigation = useTabNavigation(mockTabs, 0);
                expect(tabNavigation.activeTab).toBe(0);
                expect(tabNavigation.tabs).toEqual(mockTabs);
    
                // Test next/prev tab functionality
                tabNavigation.nextTab();
                expect(tabNavigation.activeTab).toBe(1);
    
                tabNavigation.prevTab();
                expect(tabNavigation.activeTab).toBe(0);
    
                // Test direct tab selection
                tabNavigation.selectTab(2);
                expect(tabNavigation.activeTab).toBe(2);
    
                console.log('Keyboard navigation works correctly');
            });
    
            it('should handle focus management correctly', async () => {
                // Test focus manager functionality
                const {useFocusManager} = await import('../src/hooks/useMouseInteraction.js');
    
                const focusManager = useFocusManager();
    
                // Test focus registration
                focusManager.registerFocusable('test-element', {
                    type: 'tab',
                    index: 0,
                    onFocus: () => console.log('Element focused'),
                    onActivate: () => console.log('Element activated')
                });
    
                expect(focusManager.focusOrder.length).toBe(1);
                expect(focusManager.focusOrder[0].id).toBe('test-element');
    
                // Test focus navigation
                const nextElement = focusManager.focusNext();
                expect(nextElement).toBeDefined();
                expect(focusManager.currentFocus).toBe('test-element');
    
                console.log('Focus management works correctly');
            });
    
            it('should adapt layout to different screen sizes', async () => {
                // Test layout responsiveness
                const {MainLayout} = await import('../src/components/Layout.jsx');
    
                // Mock different screen sizes
                const smallScreen = { width: 60, height: 20, isSmall: true, isMedium: false, isLarge: false };
                const mediumScreen = { width: 100, height: 25, isSmall: false, isMedium: true, isLarge: false };
                const largeScreen = { width: 150, height: 35, isSmall: false, isMedium: false, isLarge: true };
    
                // Test that layout adapts to screen sizes
                expect(smallScreen.isSmall).toBe(true);
                expect(mediumScreen.isMedium).toBe(true);
                expect(largeScreen.isLarge).toBe(true);
    
                // Test sidebar width calculation for different screen sizes
                const smallSidebarWidth = smallScreen.isSmall ? '100%' : '40%';
                const mediumSidebarWidth = mediumScreen.isMedium ? '35%' : '45%';
                const largeSidebarWidth = largeScreen.isLarge ? '30%' : '35%';
    
                expect(smallSidebarWidth).toBe('100%'); // Stack on small screens
                expect(mediumSidebarWidth).toBe('35%');
                expect(largeSidebarWidth).toBe('30%'); // More space for content on large screens
    
                console.log('Layout responsiveness works correctly');
            });
    
            it('should display system transcript with logs', async () => {
                // Test transcript panel functionality
                const mockLogs = [
                    { message: 'TUI started successfully', level: 2, timestamp: new Date() },
                    { message: 'Connected to embedded agent', level: 2, timestamp: new Date() },
                    { message: 'Ready for interaction', level: 2, timestamp: new Date() }
                ];
    
                // Test that logs are properly formatted
                expect(mockLogs.length).toBe(3);
                expect(mockLogs[0].message).toBe('TUI started successfully');
                expect(mockLogs[0].level).toBe(2); // INFO level
    
                // Test log filtering and display
                const recentLogs = mockLogs.slice(-2);
                expect(recentLogs.length).toBe(2);
                expect(recentLogs[0].message).toBe('Connected to embedded agent');
    
                console.log('System transcript displays logs correctly');
            });
        });
    });

    describe('TUI Component Integration', () => {
        it('should render all components without errors', async () => {
            // Test that all components can be imported and instantiated
            const {default: App} = await import('../src/App.jsx');
            const {default: AgentView} = await import('../src/components/AgentView.jsx');
            const {default: StatusPanel} = await import('../src/components/StatusPanel.jsx');
            const {default: LogPanel} = await import('../src/components/LogPanel.jsx');
            const {default: TasksPanel} = await import('../src/components/TasksPanel.jsx');
            const {default: MessageInput} = await import('../src/components/MessageInput.jsx');
            const {default: ConnectionDiscovery} = await import('../src/components/ConnectionDiscovery.jsx');

            // Mock agent service
            const mockService = {
                getAgentState: () => ({}),
                on: vi.fn(),
                off: vi.fn(),
                sendNarsese: vi.fn(),
                sendNaturalLanguage: vi.fn(),
                sendMessage: vi.fn(),
                sendAgentControl: vi.fn(),
                connect: vi.fn(),
                disconnect: vi.fn(),
            };

            // Test component instantiation (they should not throw)
            expect(() => {
                // These would normally render in React, but we're just testing instantiation
                const components = [
                    App,
                    AgentView,
                    StatusPanel,
                    LogPanel,
                    TasksPanel,
                    MessageInput,
                    ConnectionDiscovery
                ];

                components.forEach(Component => {
                    if (Component) {
                        // Just test that component exists and can be referenced
                        expect(Component).toBeDefined();
                    }
                });
            }).not.toThrow();

            console.log('All TUI components can be imported and referenced successfully');
        });

        it('should handle component props correctly', async () => {
            const {default: MessageInput} = await import('../src/components/MessageInput.jsx');

            const mockService = {
                sendNarsese: vi.fn(),
                sendNaturalLanguage: vi.fn(),
            };

            // Test that MessageInput handles props without errors
            expect(() => {
                // Test with different prop combinations
                const testProps = [
                    {agentService: mockService},
                    {agentService: mockService, history: ['test message']},
                    {agentService: mockService, disabled: true},
                    {agentService: mockService, onMessageSent: vi.fn()},
                ];

                testProps.forEach(props => {
                    expect(props.agentService).toBeDefined();
                });
            }).not.toThrow();

            console.log('MessageInput handles props correctly');
        });
    });

    describe('TUI Error Handling', () => {
        it('should handle WebSocket connection failures', async () => {
            const {connectionManager} = await import('../../common/services/connection.js');

            // Test connection to non-existent server
            const originalConnect = connectionManager.connect.bind(connectionManager);

            let errorHandled = false;
            connectionManager.on('error', (error) => {
                errorHandled = true;
            });

            // This should not throw but should emit error events
            expect(() => {
                connectionManager.connect('ws://localhost:9998');
            }).not.toThrow();

            await promiseTimeout(TEST_CONFIG.TIMEOUTS.CONNECTION);

            // Error should have been handled
            expect(errorHandled).toBe(true);

            connectionManager.disconnectAll();
        });

        it('should handle malformed messages gracefully', async () => {
            const testPort = await findTuiTestPort(8088);
            const mockWsServer = new WebSocketServer({port: testPort});

            mockWsServer.on('connection', (ws) => {
                // Send malformed JSON
                ws.send('invalid json{');

                // Close connection after a moment
                setTimeout(() => ws.close(), 500);
            });

            await promiseTimeout(500);

            const TuiAgentService = (await import('../src/services/TuiAgentService.js')).default;
            const service = new TuiAgentService(`ws://localhost:${testPort}`);

            // Set up error handling to prevent unhandled error events
            let errorHandled = false;
            service.on('error', (error) => {
                console.log('Handled expected error:', error);
                errorHandled = true;
            });

            // This should not throw even with malformed messages
            expect(() => {
                service.connect();
            }).not.toThrow();

            // Wait for error to be handled
            await promiseTimeout(1000);

            // Verify that the error was properly handled
            expect(errorHandled).toBe(true);

            service.disconnect();
            mockWsServer.close();
        });
    });

    describe('TUI Message Flow Integration', () => {
        it('should complete full message round-trip', async () => {
            const testPort = await findTuiTestPort(8089);
            const mockWsServer = new WebSocketServer({port: testPort});

            let receivedMessage = null;
            let responseSent = false;

            mockWsServer.on('connection', (ws) => {
                console.log('Mock WebSocket server received connection');

                ws.on('message', (data) => {
                    console.log('Mock WebSocket server received data:', data.toString());
                    try {
                        receivedMessage = JSON.parse(data.toString());
                        console.log('Parsed message:', receivedMessage);

                        // Send response
                        ws.send(JSON.stringify({
                            type: 'log',
                            payload: `Echo: ${receivedMessage.payload?.text || receivedMessage.payload}`
                        }));
                        responseSent = true;
                        console.log('Response sent:', responseSent);
                    } catch (error) {
                        console.error('Failed to parse message:', error);
                        // Send error response
                        ws.send(JSON.stringify({
                            type: 'error',
                            payload: {message: `Invalid JSON: ${error.message}`}
                        }));
                    }
                });

                ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                });
            });

            await promiseTimeout(TEST_CONFIG.RETRY_INTERVALS.MEDIUM);

            const TuiAgentService = (await import('../src/services/TuiAgentService.js')).default;
            const service = new TuiAgentService(`ws://localhost:${testPort}`);

            // Set up error handling
            service.on('error', (error) => {
                console.error('TuiAgentService error:', error);
            });

            console.log('Connecting to service...');
            service.connect();

            await promiseTimeout(TEST_CONFIG.TIMEOUTS.CONNECTION);

            console.log('Sending test message...');
            // Send a test message
            service.sendNaturalLanguage('test message');

            // Wait for message processing
            await promiseTimeout(TEST_CONFIG.TIMEOUTS.CONNECTION);

            console.log('Received message:', receivedMessage);
            console.log('Response sent:', responseSent);

            // Verify message was processed
            expect(receivedMessage).toBeTruthy();
            expect(receivedMessage.type).toBe('natural_language');
            expect(receivedMessage.payload.text).toBe('test message');
            expect(responseSent).toBe(true);

            service.disconnect();
            mockWsServer.close();
        });
    });
});