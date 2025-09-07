const AStarPlanner = require('../../src/reasoner/AStarPlanner');
const Memory = require('../../src/memory/Memory');
const Term = require('../../src/core/Term');
const Task = require('../../src/core/Task');

describe('AStarPlanner Integration Test', () => {
    let memory;
    let planner;

    beforeEach(() => {
        memory = new Memory();
        planner = new AStarPlanner(memory);
    });

    // Helper to create and add a term to memory
    const addTermToMemory = (key) => {
        const term = new Term(key);
        memory.addTerm(term);
        return term;
    };

    // Helper to add a belief to memory
    const addBeliefToMemory = (key, confidence = 0.9) => {
        const term = new Term(key);
        memory.addTerm(term);
        const belief = new Task(term, '.', { confidence });
        memory.addTasks([belief]);
        return belief;
    };

    test('should find the cheapest plan, even if it is longer', async () => {
        // Path 1 (shorter, but expensive): goal ==> action_expensive
        addTermToMemory('(goal ==> action_expensive)');
        addTermToMemory('action_expensive');
        addBeliefToMemory('(action_expensive --> [10])');

        // Path 2 (longer, but cheaper): goal ==> (&&, action_cheap1, action_cheap2)
        addTermToMemory('(goal ==> (&&, action_cheap1, action_cheap2))');
        addTermToMemory('action_cheap1');
        addTermToMemory('action_cheap2');

        const goalTerm = addTermToMemory('goal');

        const goalTask = new Task(goalTerm, '!', { confidence: 0.9 });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action_cheap1', 'action_cheap2']);
    });

    test('should find a simple plan with one level of decomposition', async () => {
        // Knowledge: to achieve 'goal', you must do 'action1' then 'action2'
        addTermToMemory('(goal ==> (&&, action1, action2))');
        const goalTerm = addTermToMemory('goal');
        addTermToMemory('action1');
        addTermToMemory('action2');

        const goalTask = new Task(goalTerm, '!', { confidence: 0.9 });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action1', 'action2']);
    });

    test('should return a plan with a single primitive action', async () => {
        // Knowledge: to achieve 'goal', you must do 'action1'. 'action1' is primitive.
        addTermToMemory('(goal ==> action1)');
        const goalTerm = addTermToMemory('goal');
        addTermToMemory('action1');

        const goalTask = new Task(goalTerm, '!', { confidence: 0.9 });
        const plan = await planner.findPlan(goalTask);

        // The planner's job is to find the sequence of primitives. It correctly finds ['action1'].
        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action1']);
    });

    test('should find the optimal (cheapest) plan when two paths exist', async () => {
        // Path 1 (longer): goal ==> intermediate, intermediate ==> (&&, action1, action2)
        addTermToMemory('(goal ==> intermediate)');
        addTermToMemory('(intermediate ==> (&&, action1, action2))');

        // Path 2 (shorter): goal ==> action3
        addTermToMemory('(goal ==> action3)');

        const goalTerm = addTermToMemory('goal');
        addTermToMemory('intermediate');
        addTermToMemory('action1');
        addTermToMemory('action2');
        addTermToMemory('action3');

        const goalTask = new Task(goalTerm, '!', { confidence: 0.9 });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action3']);
    });

    test('should return an empty plan if the goal is already achieved', async () => {
        const goalTerm = addTermToMemory('achieved_goal');

        // The belief that the goal is already achieved exists in memory
        const belief = new Task(goalTerm, '.', { confidence: 0.99 });
        memory.addTasks([belief]);

        const goalTask = new Task(goalTerm, '!', { confidence: 0.9 });
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

        const goalTask = new Task(goalTerm, '!', { confidence: 0.9 });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action']);
    });
});
