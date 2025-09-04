const {AdvancedReasoner} = require('../../src/reasoner/AdvancedReasoner');
const Memory = require('../../src/memory/Memory');
const Task = require('../../src/core/Task');
const Term = require('../../src/core/Term');
const {parseTerm} = require('../../src/parser/NewParser');
const LM = require('../../src/lm/LM');

jest.mock('@xenova/transformers', () => ({
    pipeline: jest.fn(() => {
        return jest.fn(() => ({
            data: new Float32Array(),
        }));
    }),
}));

describe('AdvancedReasoner Integration Test', () => {
    let reasoner, memory, lm;

    beforeEach(() => {
        reasoner = new AdvancedReasoner();
        memory = new Memory();
        lm = new LM();
    });

    test('should perform induction', async () => {
        const termA = await lm.bootstrapTerm('cat');
        const termB = await lm.bootstrapTerm('mammal');
        const termC = await lm.bootstrapTerm('dog');
        memory.addTerm(termA);
        memory.addTerm(termB);
        memory.addTerm(termC);

        const task1 = new Task(parseTerm('(cat --> mammal)'), '.');
        const task2 = new Task(parseTerm('(dog --> mammal)'), '.');

        const derivedTask = reasoner.induction(task1, task2);
        expect(derivedTask).toBeDefined();
        expect(derivedTask.termKey).toBe('(cat --> dog)');
    });

    test('should perform abduction', async () => {
        const termA = await lm.bootstrapTerm('cat');
        const termB = await lm.bootstrapTerm('mammal');
        const termC = await lm.bootstrapTerm('dog');
        memory.addTerm(termA);
        memory.addTerm(termB);
        memory.addTerm(termC);

        const task1 = new Task(parseTerm('(cat --> mammal)'), '.');
        const task2 = new Task(parseTerm('(dog --> mammal)'), '.');

        const derivedTask = reasoner.abduction(task1, task2);
        expect(derivedTask).toBeDefined();
        expect(derivedTask.termKey).toBe('(dog --> cat)');
    });

    test('should perform analogy', async () => {
        const termA = await lm.bootstrapTerm('cat');
        const termB = await lm.bootstrapTerm('mammal');
        const termC = await lm.bootstrapTerm('dog');
        const termD = await lm.bootstrapTerm('animal');
        memory.addTerm(termA);
        memory.addTerm(termB);
        memory.addTerm(termC);
        memory.addTerm(termD);

        const task1 = new Task(parseTerm('(cat --> mammal)'), '.');
        const task2 = new Task(parseTerm('(dog --> animal)'), '.');
        const task3 = new Task(parseTerm('(cat --> dog)'), '.');

        const derivedTask = reasoner.analogy(task1, task2, task3);
        expect(derivedTask).toBeDefined();
        expect(derivedTask.termKey).toBe('(mammal --> animal)');
    });
});
