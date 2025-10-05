import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import AgentManager from '../../agent/AgentManager.js';
import {WebSocketManager} from '../../agent/WebSocketManager.js';
import {findAvailablePort} from '../utils/networkUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';

describe('TUI End-to-End Integration Test', () => {
    let agentManager;
    let wsManager;
    let wsPort;

    beforeAll(async () => {
        wsPort = await findAvailablePort(8092);

        agentManager = new AgentManager();
        wsManager = new WebSocketManager({port: wsPort});

        await wsManager.start();
        agentManager.setBroadcast(wsManager.broadcast.bind(wsManager));

        const messageHandler = createMessageHandler(agentManager, wsManager.broadcast.bind(wsManager));
        wsManager.setMessageHandler(messageHandler);

        await agentManager.initialize();
    }, 30000);

    afterAll(async () => {
        await wsManager?.stop();
        await agentManager?.stop();
    });

    it('should connect and get agent state', async () => {
        const agent = agentManager.getAgent();
        expect(agent).toBeDefined();

        const state = agent.getAgentState();
        expect(state).toBeDefined();
    });

    it('should handle agent commands', async () => {
        const agent = agentManager.getAgent();

        // Test basic command execution
        const result = await agent.system.commandBus.request('test:command');
        expect(result).toBeDefined();
    });
});