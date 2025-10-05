import {beforeEach, describe, expect, it, vi} from 'vitest';
import AgentManager from '../../agent/AgentManager.js';
import fs from 'fs';
import {glob} from 'glob';

vi.mock('../../core/index.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        createSystem: vi.fn().mockResolvedValue({
            eventBus: {on: vi.fn(), off: vi.fn(), emit: vi.fn()},
            memory: {
                getAllTasks: vi.fn().mockReturnValue([{id: 'task1'}]),
                getBeliefs: vi.fn().mockReturnValue([{id: 'belief1'}]),
                getGoals: vi.fn().mockReturnValue([{id: 'goal1'}]),
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

vi.mock('chokidar', () => ({
    default: {watch: vi.fn().mockReturnValue({on: vi.fn(), close: vi.fn()})}
}));

describe('AgentManager Integration Test', () => {
    let agentManager;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup fs mocks
        fs.readFileSync = vi.fn().mockReturnValue('goal: [do something]');
        fs.existsSync = vi.fn().mockReturnValue(true);
        glob.sync = vi.fn().mockReturnValue(['/test/docs/test.md']);

        const mockBroadcast = vi.fn();
        agentManager = new AgentManager(mockBroadcast);
    });

    it('should initialize correctly', async () => {
        await agentManager.initialize();
        const agent = agentManager.getAgent();
        expect(agent).toBeDefined();
    });

    it('should get agent state', async () => {
        await agentManager.initialize();
        const agent = agentManager.getAgent();
        const state = agent.getAgentState();
        expect(state.tasks).toEqual([{id: 'task1'}]);
    });

    it('should stop agent', async () => {
        await agentManager.initialize();
        await agentManager.stop();
        expect(agentManager.system.commandBus.request).toHaveBeenCalled();
    });

    it('should reset agent', async () => {
        await agentManager.initialize();
        await agentManager.reset();
        expect(agentManager.system.commandBus.request).toHaveBeenCalled();
    });
});