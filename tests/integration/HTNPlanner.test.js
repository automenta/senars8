import HTNPlanner from '../../src/reasoner/HTNPlanner.js';
import Memory from '../../src/memory/Memory.js';
import Term from '../../src/core/Term.js';
import Task from '../../src/core/Task.js';

describe('HTNPlanner Integration Test', () => {
    let memory;
    let planner;

    beforeEach(() => {
        memory = new Memory();
        planner = new HTNPlanner(memory);
    });

    test('should find a simple plan with one level of decomposition', async() => {
        // Simplified test case
        const goalKey = 'a';
        const action1Key = 'b';
        const action2Key = 'c';
        // Narsese for: a ==> (&&, b, c)
        const methodKey = `(${goalKey} ==> (&&,${action1Key},${action2Key}))`;

        const goalTerm = new Term(goalKey);
        const action1Term = new Term(action1Key);
        const action2Term = new Term(action2Key);
        const methodTerm = new Term(methodKey);

        memory.addTerm(goalTerm);
        memory.addTerm(action1Term);
        memory.addTerm(action2Term);
        memory.addTerm(methodTerm);

        const goalTask = new Task(goalTerm, '!', { frequency: 1.0, confidence: 0.9 });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan).toHaveLength(2);
        expect(plan[0].key).toBe(action1Key);
        expect(plan[1].key).toBe(action2Key);
    });
});
