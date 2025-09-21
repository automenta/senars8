import AStarPlanner from '../../src/reasoner/AStarPlanner.js';
import Memory from '../../src/memory/Memory.js';
import Term from '../../src/core/Term.js';
import Task from '../../src/core/Task.js';
import ConfigManager from '../../src/config/ConfigManager.js';

describe('AStarPlanner Debug Test', () => {
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

    test('should find a simple plan', async () => {
        addTermToMemory('(goal ==> action)');
        const goalTerm = addTermToMemory('goal');
        addTermToMemory('action');

        const goalTask = new Task(goalTerm, '!', {
            confidence: 0.9
        });
        const plan = await planner.findPlan(goalTask);

        expect(plan).not.toBeNull();
        expect(plan.map(p => p.key)).toEqual(['action']);
    });
});
