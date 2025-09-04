const Cycle = require('../../src/system/Cycle');
const Memory = require('../../src/memory/Memory');
const Reasoner = require('../../src/reasoner/Reasoner');
const LM = require('../../src/lm/LM');
const Task = require('../../src/core/Task');
const Term = require('../../src/core/Term');
const {parseTerm} = require('../../src/parser/TermParser');

jest.mock('@xenova/transformers', () => ({
    pipeline: jest.fn(() => {
        return jest.fn(() => ({
            data: new Float32Array(),
        }));
    }),
}));

jest.mock('../../src/lm/LM');

describe('Cycle Integration Test', () => {
    let memory, reasoner, lm, cycle;

    beforeEach(() => {
        memory = new Memory();
        reasoner = new Reasoner();
        lm = new LM();
        cycle = new Cycle(memory, reasoner, lm);

        lm.generateHypotheses.mockResolvedValue([]);
        lm.bootstrapTerm.mockImplementation(async (termKey) => {
            return new Term(termKey, [], 1);
        });
    });

    test('should run a cycle without errors', async () => {
        await expect(cycle.runOnce()).resolves.not.toThrow();
    });

    test('should add new tasks to memory and derive new knowledge', async () => {
        const term1 = new Term('cat', [1, 0, 0], 1);
        const term2 = new Term('mammal', [0, 1, 0], 1);
        await memory.addTerm(term1);
        await memory.addTerm(term2);

        const task1 = new Task(term1, '.');
        const task2 = new Task(parseTerm('(cat --> mammal)'), '.');
        await memory.addTasks([task1, task2]);

        await cycle.runOnce();

        const tasks = memory.getAllTasks();
        const derivedTask = tasks.find(t => t.termKey === 'mammal' && t.punctuation === '.');

        expect(derivedTask).toBeDefined();
    });

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
