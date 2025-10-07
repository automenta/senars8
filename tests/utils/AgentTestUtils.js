import {vi} from 'vitest';
import {SystemCommands} from '../../core/system/SystemCommands.js';

/**
 * Shared test utilities for agent testing
 * Consolidates common mocking patterns and test setup
 */

// Common mock system factory for integration tests
export const createMockSystem = () => ({
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
            if (command === SystemCommands.SYSTEM_ADD_TASKS) {
                return {success: true};
            }
            return {success: true};
        }),
        handle: vi.fn(),
    },
    stop: vi.fn(),
});

// Simplified core index mock for agent tests - only mock what's needed
export const createCoreIndexMock = (mockSystem) => ({
    createSystem: vi.fn().mockResolvedValue(mockSystem),
    agentErrorHandler: {
        execute: vi.fn((fn) => fn()),
        executeSync: vi.fn((fn) => fn()),
        runAsync: vi.fn((fn) => fn()),
        runSync: vi.fn((fn) => fn()),
    },
    // Core exports that are commonly used in agent tests
    Task: (await vi.importActual('../../core/index.js')).Task,
    Term: (await vi.importActual('../../core/index.js')).Term,
    BaseEntity: (await vi.importActual('../../core/index.js')).BaseEntity,
    config: (await vi.importActual('../../core/index.js')).config,
    generateId: (await vi.importActual('../../core/index.js')).generateId,
    error: (await vi.importActual('../../core/index.js')).error,
    warn: (await vi.importActual('../../core/index.js')).warn,
    info: (await vi.importActual('../../core/index.js')).info,
    debug: (await vi.importActual('../../core/index.js')).debug,
    parseTerm: (await vi.importActual('../../core/index.js')).parseTerm,
    isBelief: (await vi.importActual('../../core/index.js')).isBelief,
    isGoal: (await vi.importActual('../../core/index.js')).isGoal,
    isQuestion: (await vi.importActual('../../core/index.js')).isQuestion,
    isTask: (await vi.importActual('../../core/index.js')).isTask,
    System: (await vi.importActual('../../core/index.js')).System,
    EventBus: (await vi.importActual('../../core/index.js')).EventBus,
    Memory: (await vi.importActual('../../core/index.js')).Memory,
});

// Test setup helper for agent integration tests
export const setupAgentTest = async (testConfig = {}) => {
    const mockSystem = createMockSystem();
    const coreIndexMock = createCoreIndexMock(mockSystem);

    // Apply vi.mock for core index
    vi.mock('../../core/index.js', () => coreIndexMock);

    return {
        mockSystem,
        coreIndexMock,
        cleanup: () => {
            vi.clearAllMocks();
        }
    };
};

// Common test expectations for agent operations
export const expectAgentInitialization = (agentManager, broadcastSpy) => {
    expect(agentManager.isAgentInitialized()).toBe(true);
    expect(broadcastSpy).toHaveBeenCalledWith({
        type: 'agentStatus',
        payload: 'initialized'
    });
};

export const expectAgentStart = (broadcastSpy) => {
    expect(broadcastSpy).toHaveBeenCalledWith({
        type: 'log',
        payload: {source: 'system', message: 'Agent command received: start'}
    });
};

export const expectAgentStop = (broadcastSpy) => {
    expect(broadcastSpy).toHaveBeenCalledWith({
        type: 'log',
        payload: {source: 'system', message: 'Agent command received: stop'}
    });
};

export const expectAgentReset = (broadcastSpy) => {
    expect(broadcastSpy).toHaveBeenCalledWith({
        type: 'log',
        payload: {source: 'system', message: 'Agent command received: reset'}
    });
};

export const expectAgentState = (state) => {
    expect(state).toEqual({
        tasks: [],
        beliefs: [],
        goals: [],
        questions: []
    });
};