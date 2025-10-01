import {beforeEach, describe, expect, it, vi} from 'vitest';
import AgentManager from '../../agent/AgentManager.js';
import fs from 'fs';
import {glob} from 'glob';
import PlanProcessor from '../../core/utils/PlanProcessor.js';
import { SystemCommands } from '../../core/system/SystemCommands.js';

vi.mock('../../core/utils/PlanProcessor.js');

const {mockSystem} = vi.hoisted(() => ({
    mockSystem: {
        eventBus: {on: vi.fn(), emit: vi.fn()},
        memory: {
            getAllTasks: vi.fn().mockReturnValue([{id: 'task1'}]),
            getBeliefs: vi.fn().mockReturnValue([{id: 'belief1'}]),
            getGoals: vi.fn().mockReturnValue([{id: 'goal1'}]),
            getQuestions: vi.fn().mockReturnValue([{id: 'question1'}]),
        },
        addTasks: vi.fn().mockResolvedValue(undefined),
        commandBus: {
            request: vi.fn()
        },
        reasoner: {
            planner: {
                createPlan: vi.fn().mockResolvedValue({steps: [{key: 'action'}]}),
            },
        },
        stop: vi.fn(),
    }
}));

const {watcherInstance} = vi.hoisted(() => {
    const instance = {
        on: vi.fn(),
        add: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn(),
        _events: {},
        _clear: function () {
            this._events = {};
            this.on.mockClear();
            this.add.mockClear();
            this.close.mockClear();
            this.stop.mockClear();
        },
        _trigger: function (event, ...args) {
            if (this._events[event]) this._events[event](...args);
        },
    };
    instance.on.mockImplementation(function (event, callback) {
        instance._events[event] = callback;
        return instance;
    });
    return {watcherInstance: instance};
});

vi.mock('../../core/index.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        createSystem: vi.fn().mockResolvedValue(mockSystem),
    };
});

vi.mock('chokidar', () => ({
    default: {
        watch: vi.fn().mockReturnValue(watcherInstance),
    },
}));

vi.mock('fs');
vi.mock('glob');

describe('AgentManager Integration Test', () => {
    let agentManager;
    let mockPlanProcessor;
    let mockBroadcast;

    beforeEach(() => {
        vi.clearAllMocks();
        watcherInstance._clear();
        glob.sync.mockClear();

        mockPlanProcessor = {
            initialize: vi.fn(),
            processFile: vi.fn().mockResolvedValue([{content: 'goal'}]),
            convertGoalsToTasks: vi.fn().mockReturnValue([{goal: 'task'}]),
        };
        PlanProcessor.mockImplementation(() => mockPlanProcessor);

        fs.readFileSync.mockReturnValue('goal: [do something]');
        fs.existsSync.mockReturnValue(true);
        glob.sync.mockReturnValue(['/test/docs/test.md']);

        mockBroadcast = vi.fn();
        agentManager = new AgentManager(mockBroadcast);
    });

    it('should initialize correctly', async () => {
        await agentManager.initialize();
        const agent = agentManager.getAgent();
        expect(agent.isInitialized).toBe(true);
    });

    it('should process an existing file on startup', async () => {
        await agentManager.initialize();
        await new Promise(resolve => setTimeout(resolve, 20));
        const agent = agentManager.getAgent();
        expect(agent.system.addTasks).toHaveBeenCalledWith([{goal: 'task'}]);
    });

    it('should get agent state from the agent', async () => {
        await agentManager.initialize();
        const agent = agentManager.getAgent();
        const state = agent.getAgentState();
        expect(state.tasks).toEqual([{id: 'task1'}]);
    });

    it('should stop agent cycling via command', async () => {
        await agentManager.initialize();
        await agentManager.stop();
        const agent = agentManager.getAgent();
        expect(agent.system.commandBus.request).toHaveBeenCalledWith(SystemCommands.SYSTEM_STOP_CYCLING);
    });

    it('should reset agent via command', async () => {
        await agentManager.initialize();
        await agentManager.reset();
        const agent = agentManager.getAgent();
        expect(agent.system.commandBus.request).toHaveBeenCalledWith(SystemCommands.SYSTEM_RESET);
    });
});