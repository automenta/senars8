import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import AgentManager from '../../agent/AgentManager.js';
import {WebSocketManager} from '../../agent/WebSocketManager.js';
import {findAvailablePort} from '../utils/networkUtils.js';
import {createMessageHandler} from '../../agent/MessageHandler.js';

vi.mock('../../core/system/System.js', () => ({
    default: vi.fn(() => ({
        eventBus: {on: vi.fn(), off: vi.fn(), emit: vi.fn()},
        commandBus: {request: vi.fn().mockResolvedValue({success: true})},
        initialize: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
    }))
}));

describe('WebSocket Connectivity Integration Test', () => {
    let agentManager;
    let wsManager;
    let wsPort;

    beforeEach(async () => {
        wsPort = await findAvailablePort(8083);

        agentManager = new AgentManager();
        wsManager = new WebSocketManager({port: wsPort});

        await wsManager.start();
        agentManager.setBroadcast(wsManager.broadcast.bind(wsManager));

        const messageHandler = createMessageHandler(agentManager);
        wsManager.setMessageHandler(messageHandler);

        await agentManager.initialize();
    });

    afterEach(async () => {
        await wsManager?.stop();
        await agentManager?.stop();
    });

    it('should initialize agent manager', async () => {
        const agent = agentManager.getAgent();
        expect(agent).toBeDefined();
    });

    it('should handle agent state', async () => {
        const agent = agentManager.getAgent();
        const state = agent.getAgentState();
        expect(state).toBeDefined();
    });

    it('should handle agent commands', async () => {
        const agent = agentManager.getAgent();
        const result = await agent.system.commandBus.request('test:command');
        expect(result).toBeDefined();
    });
});