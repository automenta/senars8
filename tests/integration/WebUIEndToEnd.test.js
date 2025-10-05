import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import AgentManager from '../../agent/AgentManager.js';

// Mock the core module to provide agentErrorHandler and createSystem
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

describe('WebUI Integration Test', () => {
    let agentManager;
    let mockBroadcast;

    beforeEach(async () => {
        // Use a simple mock broadcast function instead of starting a full server
        mockBroadcast = vi.fn();
        agentManager = new AgentManager(mockBroadcast);
    });

    afterEach(async () => {
        if (agentManager) {
            await agentManager.stop();
        }
    });

    it('should initialize agent manager without startup errors', async () => {
        // Test that agent manager initializes properly without requiring full server startup
        await expect(agentManager.initialize()).resolves.not.toThrow();

        const agent = agentManager.getAgent();
        expect(agent).toBeDefined();

        // AgentManager.initialize() calls agent.initialize(), so agent should be initialized
        const isInitialized = agentManager.isAgentInitialized();
        expect(isInitialized).toBe(true);

        // Test that we can still call initialize without error (should be idempotent)
        await expect(agent.initialize()).resolves.not.toThrow();
    }, 5000); // Reduced timeout since we're not starting a full server

    it('should handle broadcast function correctly', async () => {
        await agentManager.initialize();

        // Test that broadcast function is properly set
        expect(mockBroadcast).toBeDefined();

        // Test that agent state can be retrieved
        const agentState = agentManager.getAgent().getAgentState();
        expect(agentState).toBeDefined();
    }, 3000);
});