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

// Common core index mock for agent tests
export const createCoreIndexMock = (mockSystem) => ({
    createSystem: vi.fn().mockResolvedValue(mockSystem),
    agentErrorHandler: {
        execute: vi.fn((fn) => fn()),
        executeSync: vi.fn((fn) => fn()),
        runAsync: vi.fn((fn) => fn()),
        runSync: vi.fn((fn) => fn()),
    },
    // Re-export other core exports as-is
    Task: vi.importActual('../../core/index.js').then(mod => mod.Task),
    Term: vi.importActual('../../core/index.js').then(mod => mod.Term),
    BaseEntity: vi.importActual('../../core/index.js').then(mod => mod.BaseEntity),
    config: vi.importActual('../../core/index.js').then(mod => mod.config),
    PUNCTUATION: vi.importActual('../../core/index.js').then(mod => mod.PUNCTUATION),
    OP: vi.importActual('../../core/index.js').then(mod => mod.OP),
    REL: vi.importActual('../../core/index.js').then(mod => mod.REL),
    TOKEN: vi.importActual('../../core/index.js').then(mod => mod.TOKEN),
    cosineSimilarity: vi.importActual('../../core/index.js').then(mod => mod.cosineSimilarity),
    embeddingsEqual: vi.importActual('../../core/index.js').then(mod => mod.embeddingsEqual),
    generateId: vi.importActual('../../core/index.js').then(mod => mod.generateId),
    error: vi.importActual('../../core/index.js').then(mod => mod.error),
    warn: vi.importActual('../../core/index.js').then(mod => mod.warn),
    info: vi.importActual('../../core/index.js').then(mod => mod.info),
    debug: vi.importActual('../../core/index.js').then(mod => mod.debug),
    parseTerm: vi.importActual('../../core/index.js').then(mod => mod.parseTerm),
    validateTermKey: vi.importActual('../../core/index.js').then(mod => mod.validateTermKey),
    filterByProperty: vi.importActual('../../core/index.js').then(mod => mod.filterByProperty),
    normalizeToArray: vi.importActual('../../core/index.js').then(mod => mod.normalizeToArray),
    isNonEmptyArray: vi.importActual('../../core/index.js').then(mod => mod.isNonEmptyArray),
    isEmptyArray: vi.importActual('../../core/index.js').then(mod => mod.isEmptyArray),
    isPlainObject: vi.importActual('../../core/index.js').then(mod => mod.isPlainObject),
    sumBy: vi.importActual('../../core/index.js').then(mod => mod.sumBy),
    safeGet: vi.importActual('../../core/index.js').then(mod => mod.safeGet),
    isBelief: vi.importActual('../../core/index.js').then(mod => mod.isBelief),
    isGoal: vi.importActual('../../core/index.js').then(mod => mod.isGoal),
    isQuestion: vi.importActual('../../core/index.js').then(mod => mod.isQuestion),
    getTasksByType: vi.importActual('../../core/index.js').then(mod => mod.getTasksByType),
    getBeliefTasks: vi.importActual('../../core/index.js').then(mod => mod.getBeliefTasks),
    getGoalTasks: vi.importActual('../../core/index.js').then(mod => mod.getGoalTasks),
    getQuestionTasks: vi.importActual('../../core/index.js').then(mod => mod.getQuestionTasks),
    isTask: vi.importActual('../../core/index.js').then(mod => mod.isTask),
    System: vi.importActual('../../core/index.js').then(mod => mod.System),
    SystemFactory: vi.importActual('../../core/index.js').then(mod => mod.SystemFactory),
    Cycle: vi.importActual('../../core/index.js').then(mod => mod.Cycle),
    ActionExecutor: vi.importActual('../../core/index.js').then(mod => mod.ActionExecutor),
    Perception: vi.importActual('../../core/index.js').then(mod => mod.Perception),
    Planner: vi.importActual('../../core/index.js').then(mod => mod.Planner),
    MetaCognition: vi.importActual('../../core/index.js').then(mod => mod.MetaCognition),
    Introspection: vi.importActual('../../core/index.js').then(mod => mod.Introspection),
    EventBus: vi.importActual('../../core/index.js').then(mod => mod.EventBus),
    createUnifiedErrorHandler: vi.importActual('../../core/index.js').then(mod => mod.createUnifiedErrorHandler),
    Reasoner: vi.importActual('../../core/index.js').then(mod => mod.Reasoner),
    TruthValueManager: vi.importActual('../../core/index.js').then(mod => mod.TruthValueManager),
    TemporalReasoner: vi.importActual('../../core/index.js').then(mod => mod.TemporalReasoner),
    Memory: vi.importActual('../../core/index.js').then(mod => mod.Memory),
    LM: vi.importActual('../../core/index.js').then(mod => mod.LM),
    lexer: vi.importActual('../../core/index.js').then(mod => mod.lexer),
    tokenize: vi.importActual('../../core/index.js').then(mod => mod.tokenize),
    ReasoningStrategy: vi.importActual('../../core/index.js').then(mod => mod.ReasoningStrategy),
    SystemContext: vi.importActual('../../core/index.js').then(mod => mod.SystemContext),
});

// Test setup helper for agent integration tests
export const setupAgentTest = async (testConfig = {}) => {
    const mockSystem = createMockSystem();
    const coreIndexMock = await createCoreIndexMock(mockSystem);

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