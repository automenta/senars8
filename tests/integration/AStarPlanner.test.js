import AStarPlanner from '../../src/reasoner/AStarPlanner.js';
import Memory from '../../src/memory/Memory.js';
import Term from '../../src/core/Term.js';
import Task from '../../src/core/Task.js';
import ConfigManager from '../../src/config/ConfigManager.js';

describe('AStarPlanner Integration Test', () => {
    let memory;
    let planner;

    beforeEach(() => {
        const configManager = new ConfigManager();
        memory = new Memory(configManager);
        const lm = {
            bootstrapTerm: async termKey => new Term(termKey, [0.1, 0.2, 0.3])
        };
        const logger = {
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
        };
        planner = new AStarPlanner(memory, lm, configManager, logger);
    });

    const addTermToMemory = key => {
        const term = new Term(key, [Math.random(), Math.random(), Math.random()]);
        memory.addTerm(term);
        return term;
    };

    const addCostToMemory = (actionKey, cost) => {
        memory.indexer.costIndex.set(actionKey, cost);
    };

    test('should find the cheapest plan, even if it is longer', async () => {
        addTermToMemory('(goal ==> action_expensive)');
        addTermToMemory('action_expensive');
        addCostToMemory('action_expensive', 10);

        addTermToMemory('(goal ==> (&&, action_cheap1, action_cheap2))');
        addTermToMemory('action_cheap1');
        addCostToMemory('action_cheap1', 2);
        addTermToMemory('action_cheap2');
        addCostToMemory('action_cheap2', 2);

        const goalTerm = addTermToMemory('goal');

        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action_cheap1', 'action_cheap2']);
    });

    test('should find a simple plan with one level of decomposition', async () => {
        addTermToMemory('(goal ==> (&&, action1, action2))');
        const goalTerm = addTermToMemory('goal');
        addTermToMemory('action1');
        addTermToMemory('action2');

        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action1', 'action2']);
    });

    test('should return a plan with a single primitive action', async () => {
        addTermToMemory('(goal ==> action1)');
        const goalTerm = addTermToMemory('goal');
        addTermToMemory('action1');

        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action1']);
    });

    test('should find the optimal (cheapest) plan when two paths exist', async () => {
        addTermToMemory('(goal ==> intermediate)');
        addTermToMemory('(intermediate ==> (&&, action1, action2))');
        addTermToMemory('(goal ==> action3)');

        const goalTerm = addTermToMemory('goal');
        addTermToMemory('intermediate');
        addTermToMemory('action1');
        addTermToMemory('action2');
        addTermToMemory('action3');

        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action3']);
    });

    test('should return an empty plan if the goal is already achieved', async () => {
        const goalTerm = addTermToMemory('achieved_goal');

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
        addTermToMemory('(goal ==> step1)');
        addTermToMemory('(step1 ==> step2)');
        addTermToMemory('(step2 ==> action)');
        const goalTerm = addTermToMemory('goal');
        addTermToMemory('step1');
        addTermToMemory('step2');
        addTermToMemory('action');

        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action']);
    });

    test('should handle cyclic dependencies and not get stuck in a loop', async () => {
        addTermToMemory('(a ==> b)');
        addTermToMemory('(b ==> a)');
        const goalTerm = addTermToMemory('a');
        addTermToMemory('b');

        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).toBeNull();
    });

    test('should not use a path if preconditions are not met', async () => {
        addTermToMemory('(goal ==> (&&, precondition, action1))');
        addTermToMemory('precondition');
        addTermToMemory('action1');

        addTermToMemory('(goal ==> action2)');
        addTermToMemory('action2');

        const goalTerm = addTermToMemory('goal');
        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action2']);
    });
});
