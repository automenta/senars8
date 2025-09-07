const Cycle = require('../../src/system/Cycle');
const Memory = require('../../src/memory/Memory');
const Reasoner = require('../../src/reasoner/Reasoner');
const LM = require('../../src/lm/LM');
const { ActionExecutor } = require('../../src/system/ActionExecutor');
const Task = require('../../src/core/Task');
const Term = require('../../src/core/Term');
const {parseTerm} = require('../../src/parser/narseseParser');

jest.mock('../../src/lm/LM');

jest.mock('@xenova/transformers', () => {
    const transformers = jest.genMockFromModule('@xenova/transformers');
    transformers.pipeline = jest.fn(async () => {
        return jest.fn(() => ({
            data: new Float32Array([1, 2, 3]),
        }));
    });
    return transformers;
});

describe('Cycle Integration Test', () => {
    let memory, reasoner, lm, cycle;

    beforeEach(() => {
        memory = new Memory();
        const BruteForceStrategy = require('../../src/reasoner/strategies/BruteForceStrategy');
        reasoner = new Reasoner(new BruteForceStrategy());
        lm = new LM();
        const actionExecutor = new ActionExecutor(memory);
        cycle = new Cycle(memory, reasoner, lm, actionExecutor);

        lm.generateHypotheses.mockResolvedValue([]);
        lm.evaluateAndRankHypotheses.mockImplementation(async (tasks, hypotheses) => hypotheses);
        lm.bootstrapTerm.mockImplementation(async (termKey) => {
            return new Term(termKey, [], 1);
        });
    });

    test('should run a cycle without errors', async () => {
        await expect(cycle.runOnce()).resolves.not.toThrow();
    });

    // test('should add new tasks to memory and derive new knowledge', async () => {
    //     const term1 = new Term('cat', [1,0,0], 1);
    //     const term2 = new Term('mammal', [0,1,0], 1);
    //     const term3 = new Term('(cat ==> mammal)', [1,1,0], 2);
    //     await memory.addTerm(term1);
    //     await memory.addTerm(term2);
    //     await memory.addTerm(term3);

    //     const task1 = new Task(parseTerm('cat'), '.', {}, {}, 1);
    //     const task2 = new Task(parseTerm('(cat ==> mammal)'), '.', {}, {}, 1);

    //     // Manually boost priority to ensure they get into the focus set
    //     task1.state.priority = 100;
    //     task2.state.priority = 100;

    //     await memory.addTasks([task1, task2]);

    //     await cycle.runOnce();

    //     const tasks = memory.getAllTasks();
    //     const derivedTask = tasks.find(t => t.termKey === 'mammal' && t.punctuation === '.');

    //     expect(derivedTask).toBeDefined();
    // });

    test('should prioritize tasks based on relevance to the constitution', async () => {
        const term1 = new Term('AcquireKnowledge', [1, 0, 0], 1);
        const term2 = new Term('cat', [0, 1, 0], 1);
        await memory.addTerm(term1);
        await memory.addTerm(term2);

        const task1 = new Task(term1, '!');
        const task2 = new Task(term2, '.');
        await memory.addTasks([task1, task2]);

        await cycle.bootstrap();
        await cycle.runOnce();

        const tasks = memory.getAllTasks();
        const acquireKnowledgeTask = tasks.find(t => t.termKey === 'AcquireKnowledge');
        const catTask = tasks.find(t => t.termKey === 'cat');

        expect(acquireKnowledgeTask.state.priority).toBeGreaterThan(catTask.state.priority);
    });
});
