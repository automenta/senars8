import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import AgentManager from '../../agent/AgentManager.js';
import {SystemCommands} from '../../core/system/SystemCommands.js';

// Mock the core index to provide agentErrorHandler and createSystem
vi.mock('../../core/index.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        createSystem: vi.fn().mockResolvedValue({
            eventBus: {
                on: vi.fn(),
                off: vi.fn(),
                emit: vi.fn()
            },
            memory: {
                getAllTasks: vi.fn().mockReturnValue([]),
                getBeliefs: vi.fn().mockReturnValue([]),
                getGoals: vi.fn().mockReturnValue([]),
                getQuestions: vi.fn().mockReturnValue([]),
            },
            commandBus: {
                request: vi.fn(async (command) => {
                    if (command === SystemCommands.SYSTEM_START_CYCLING) {
                        return {success: true};
                    }
                    if (command === SystemCommands.SYSTEM_STOP_CYCLING) {
                        return {success: true};
                    }
                    return {success: true};
                }),
                handle: vi.fn(),
            },
            stop: vi.fn(),
        }),
        agentErrorHandler: {
            execute: vi.fn((fn) => fn()),
            runSync: vi.fn((fn) => fn()),
        },
    };
});

describe('EmbeddedAgentIntegration', () => {
    let agentManager;
    let broadcastSpy;

    beforeEach(async () => {
        broadcastSpy = vi.fn();
        agentManager = new AgentManager();
        agentManager.setBroadcast(broadcastSpy);
        await agentManager.initialize();
    });

    afterEach(async () => {
        if (agentManager) {
            await agentManager.stop();
        }
        vi.clearAllMocks();
    });

    it('should initialize agent quickly', async () => {
        expect(agentManager.isAgentInitialized()).toBe(true);
        expect(broadcastSpy).toHaveBeenCalledWith({
            type: 'agentStatus',
            payload: 'initialized'
        });
    });

    it('should start and stop agent efficiently', async () => {
        await agentManager.start();
        expect(broadcastSpy).toHaveBeenCalledWith({
            type: 'log',
            payload: {source: 'system', message: 'Agent command received: start'}
        });

        await agentManager.stop();
        expect(broadcastSpy).toHaveBeenCalledWith({
            type: 'log',
            payload: {source: 'system', message: 'Agent command received: stop'}
        });
    });

    it('should handle BigInt values in start command', async () => {
        // Test with large number that would be BigInt in JSON
        await agentManager.start(Number.MAX_SAFE_INTEGER + 1000);
        expect(broadcastSpy).toHaveBeenCalledWith({
            type: 'log',
            payload: {source: 'system', message: 'Agent command received: start'}
        });
    });

    it('should get agent state efficiently', () => {
        const state = agentManager.getAgent().getAgentState();
        expect(state).toEqual({
            tasks: [],
            beliefs: [],
            goals: [],
            questions: []
        });
    });

    it('should reset agent quickly', async () => {
        await agentManager.reset();
        expect(broadcastSpy).toHaveBeenCalledWith({
            type: 'log',
            payload: {source: 'system', message: 'Agent command received: reset'}
        });
    });
});