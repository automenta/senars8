import {beforeEach, describe, expect, test, vi} from 'vitest';
import AStarPlanner from '../../core/reasoner/AStarPlanner.js';
import Memory from '../../core/memory/Memory.js';
import Term from '../../core/core/Term.js';
import Task from '../../core/core/Task.js';
import ConfigManager from '../../core/config/ConfigManager.js';

describe('AStarPlanner Integration Test', () => {
    let memory;
    let planner;

    beforeEach(() => {
        const configManager = new ConfigManager();
        const mockEventBus = {
            on: vi.fn(),
            emit: vi.fn(),
            emitAsync: vi.fn(),
        };
        const mockCommandBus = {
            handle: vi.fn(),
            request: vi.fn(),
        };
        memory = new Memory(configManager, mockEventBus, mockCommandBus);
        const lm = {
            bootstrapTerm: async termKey => new Term(termKey, [0.1, 0.2, 0.3])
        };
        planner = new AStarPlanner(memory, lm, configManager);
    });

    const addTerm = (key, cost = null) => {
        const term = new Term(key, [Math.random(), Math.random(), Math.random()]);
        memory.addTerm(term);
        if (cost !== null) {
            memory.indexer.costIndex.set(key, cost);
        }
        return term;
    };

    test('should find the cheapest plan, even if it is longer', async () => {
        addTerm('(goal ==> action_expensive)', 10);
        addTerm('action_expensive', 10);
        addTerm('(goal ==> (&&, action_cheap1, action_cheap2))');
        addTerm('action_cheap1', 2);
        addTerm('action_cheap2', 2);
        const goalTerm = addTerm('goal');

        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action_cheap1', 'action_cheap2']);
    });

    test('should find a simple plan with one level of decomposition', async () => {
        addTerm('(goal ==> (&&, action1, action2))');
        const goalTerm = addTerm('goal');
        addTerm('action1');
        addTerm('action2');

        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action1', 'action2']);
    });

    test('should return a plan with a single primitive action', async () => {
        addTerm('(goal ==> action1)');
        const goalTerm = addTerm('goal');
        addTerm('action1');

        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action1']);
    });

    test('should find the optimal (cheapest) plan when two paths exist', async () => {
        addTerm('(goal ==> intermediate)');
        addTerm('(intermediate ==> (&&, action1, action2))');
        addTerm('(goal ==> action3)');
        const goalTerm = addTerm('goal');
        addTerm('intermediate');
        addTerm('action1');
        addTerm('action2');
        addTerm('action3');

        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action3']);
    });

    test('should return an empty plan if the goal is already achieved', async () => {
        const goalTerm = addTerm('achieved_goal');
        const belief = new Task(goalTerm, '.', {
            confidence: 0.99
        });
        memory.addTasks([belief]);

        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan).toEqual([]);
    });

    test('should handle multi-level decomposition', async () => {
        addTerm('(goal ==> step1)');
        addTerm('(step1 ==> step2)');
        addTerm('(step2 ==> action)');
        const goalTerm = addTerm('goal');
        addTerm('step1');
        addTerm('step2');
        addTerm('action');

        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action']);
    });

    test('should handle cyclic dependencies and not get stuck in a loop', async () => {
        addTerm('(a ==> b)');
        addTerm('(b ==> a)');
        const goalTerm = addTerm('a');
        addTerm('b');

        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).toBeNull();
    });

    test('should not use a path if preconditions are not met', async () => {
        addTerm('(goal ==> (&&, precondition, action1))');
        addTerm('precondition');
        addTerm('action1');
        addTerm('(goal ==> action2)');
        addTerm('action2');

        const goalTerm = addTerm('goal');
        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action2']);
    });
});