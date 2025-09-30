import {beforeEach, describe, expect, it, vi} from 'vitest';
import Agent from '../../agent/Agent.js';
import fs from 'fs';
import {glob} from 'glob';
import PlanProcessor from '../../core/utils/PlanProcessor.js';

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
        add: vi.fn(), // Added the missing mock function
        close: vi.fn().mockResolvedValue(undefined),
        _events: {},
        _clear: function () {
            this._events = {};
            this.on.mockClear();
            this.add.mockClear();
            this.close.mockClear();
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

describe('Agent Integration Test', () => {
    let agent;
    let mockPlanProcessor;

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

        agent = new Agent({
            fileMonitoring: {
                patterns: ['/test/docs/**/*.md'],
                watchDir: '/test',
                debounce: 10,
            },
        });
    });

    it('should initialize correctly', async () => {
        await agent.initialize();
        expect(agent.isInitialized).toBe(true);
        expect(agent.fileMonitoring.isWatching).toBe(true);
    });

    it('should process an existing file on startup', async () => {
        await agent.initialize();
        await new Promise(resolve => setTimeout(resolve, 20));
        expect(agent.system.addTasks).toHaveBeenCalledWith([{goal: 'task'}]);
    });

    it('should get agent state', async () => {
        await agent.initialize();
        const state = agent.getAgentState();
        expect(state.tasks).toEqual([{id: 'task1'}]);
    });

    it('should call addPatterns', async () => {
        await agent.initialize();
        await agent.addMonitoringPatterns(['**/*.txt']);
        expect(watcherInstance.add).toHaveBeenCalledWith(['**/*.txt']);
        expect(agent.fileMonitoring.options.patterns).toContain('**/*.txt');
    });

    it('should stop all services gracefully', async () => {
        await agent.initialize();
        vi.spyOn(agent.fileMonitoring, 'stop');
        await agent.stop();
        expect(agent.fileMonitoring.stop).toHaveBeenCalled();
        expect(agent.system.stop).toHaveBeenCalled();
    });
});