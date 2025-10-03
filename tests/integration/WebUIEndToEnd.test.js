import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {ServerProcessManager} from '../utils/ServerProcessManager.js';

describe('WebUI End-to-End Test', () => {
    let serverManager;
    let testPort;
    let wsPort;

    beforeEach(async () => {
        serverManager = new ServerProcessManager();

        // Find available ports
        testPort = await serverManager.findAvailablePort(8080);
        wsPort = await serverManager.findAvailablePort(8081); // Default WebSocket port

        // Start the server with separate ports for HTTP and WebSocket
        await serverManager.startServer(testPort, wsPort);
    }, 40000); // Increase timeout for setup since we're starting a full process

    afterEach(async () => {
        if (serverManager) {
            await serverManager.stopServer();
        }
    }, 15000); // Increase timeout for cleanup

    it('should initialize agent manager without startup errors', async () => {
        // This test verifies that the agent manager can be initialized without errors.
        // It's a high-level integration test rather than a strict E2E UI test.
        const AgentManager = (await import('../../agent/AgentManager.js')).default;
        const mockBroadcast = vi.fn();
        const agentManager = new AgentManager(mockBroadcast);
        await expect(agentManager.initialize()).resolves.not.toThrow();
        const agent = agentManager.getAgent();
        expect(agent).toBeDefined();
    }, 8000);
});