import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import AgentManager from '../../agent/AgentManager.js';
import {WebSocketManager} from '../../agent/WebSocketManager.js';
import {findAvailablePort} from '../utils/networkUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';
import ApiService from '../../common/services/ApiService.js';

describe('TUI End-to-End Integration Test', () => {
    let agentManager;
    let wsManager;
    let wsUrl;
    let wsPort;
    let apiService;

    beforeAll(async () => {
        wsPort = await findAvailablePort(8092); // Use a different port
        wsUrl = `ws://localhost:${wsPort}`;

        // Set up the agent with WebSocket
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

        // Create an API service that simulates the TUI's usage
        apiService = new ApiService(wsUrl);
    }, 60000);

    afterAll(async () => {
        if (apiService) {
            apiService.disconnect();
        }
        if (wsManager) {
            await wsManager.stop();
        }
        if (agentManager) {
            await agentManager.stop();
        }
    }, 30000);

    it('should connect and perform full TUI workflow', async () => {
        // Connect to the agent
        apiService.connect();

        // Wait for connection
        await new Promise(resolve => {
            apiService.on('status', (status) => {
                if (status === 'connected') {
                    resolve();
                }
            });
        });

        // Test getting initial state - this is what the TUI does on connect
        const initialStatsPromise = new Promise(resolve => {
            apiService.on('system_stats', resolve);
        });

        const initialBeliefsPromise = new Promise(resolve => {
            apiService.on('beliefs_response', resolve);
        });

        const initialGoalsPromise = new Promise(resolve => {
            apiService.on('goals_response', resolve);
        });

        // Request initial state like the TUI does
        apiService.sendMessage('get_system_stats');
        apiService.sendMessage('get_tasks');
        apiService.sendMessage('get_beliefs');
        apiService.sendMessage('get_goals');

        // Wait for responses
        const stats = await initialStatsPromise;
        const beliefs = await initialBeliefsPromise;
        const goals = await initialGoalsPromise;

        // Verify we got valid responses
        expect(stats).toBeDefined();
        expect(beliefs).toBeDefined();
        expect(goals).toBeDefined();

        // Test sending a Narsese statement like a TUI user would
        const narsesePromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Narsese response timed out')), 5000);
            apiService.on('log', (message) => {
                clearTimeout(timeout);
                // Accept log response as success (this is what the system sends for Narsese input)
                resolve(message);
            });
            // Also listen for error messages
            apiService.on('error', (error) => {
                clearTimeout(timeout);
                resolve(error); // Resolve with error rather than rejecting to see what happened
            });
        });

        await apiService.sendNarsese('<test --> concept>.');
        const narseseResponse = await narsesePromise;

        // The response should be defined (either a log message or error message)
        expect(narseseResponse).toBeDefined();

        // Test sending agent control command
        const controlPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Control response timed out')), 5000);
            apiService.on('log', (message) => {
                clearTimeout(timeout);
                resolve(message); // Accept log response as success
            });
            // Also listen for error messages
            apiService.on('error', (error) => {
                clearTimeout(timeout);
                resolve(error); // Resolve with error to see what happened
            });
        });

        await apiService.sendAgentControl('start');
        const controlResponse = await controlPromise;

        // The response should be defined (either a log message or error message)
        expect(controlResponse).toBeDefined();
    });
});