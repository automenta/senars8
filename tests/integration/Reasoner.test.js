const Reasoner = require('../../src/reasoner/Reasoner');
const Memory = require('../../src/memory/Memory');
const Task = require('../../src/core/Task');
const Term = require('../../src/core/Term');
const {parseTerm} = require('../../src/parser/NewParser');
const LM = require('../../src/lm/LM');

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

describe('Reasoner Integration Test', () => {
    let reasoner, memory, lm;

    beforeEach(() => {
        reasoner = new Reasoner();
        memory = new Memory();
        lm = new LM();

        lm.bootstrapTerm.mockImplementation(async (termKey) => {
            return new Term(termKey, [], 1);
        });
    });

    test('should perform modus ponens', async () => {
        const termA = await lm.bootstrapTerm('cat');
        const termB = await lm.bootstrapTerm('mammal');
        memory.addTerm(termA);
        memory.addTerm(termB);

        const task1 = new Task(parseTerm('(cat ==> mammal)'), '.');
        const task2 = new Task(termA, '.');

        const derivedTasks = reasoner.performInference([task1, task2], memory.terms);
        const derivedTask = derivedTasks.find(t => t.termKey === 'mammal');
        expect(derivedTask).toBeDefined();
    });

    test('should perform inheritance chaining', async () => {
        const termA = await lm.bootstrapTerm('cat');
        const termB = await lm.bootstrapTerm('mammal');
        const termC = await lm.bootstrapTerm('animal');
        memory.addTerm(termA);
        memory.addTerm(termB);
        memory.addTerm(termC);

        const task1 = new Task(parseTerm('(cat --> mammal)'), '.');
        const task2 = new Task(parseTerm('(mammal --> animal)'), '.');

        const derivedTasks = reasoner.performInference([task1, task2], memory.terms);
        const derivedTask = derivedTasks.find(t => t.termKey === '(cat --> animal)');
        expect(derivedTask).toBeDefined();
    });
});
