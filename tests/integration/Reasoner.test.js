import SystemFactory from '../../core/system/SystemFactory.js';
import Task from '../../core/core/Task.js';
import Term from '../../core/core/Term.js';
import {parseTerm} from '../../core/parser/narseseParser.js';

jest.mock('@xenova/transformers', () => {
    const transformers = jest.createMockFromModule('@xenova/transformers');
    transformers.pipeline = jest.fn(async () =>
        jest.fn(() => ({
            data: new Float32Array([1, 2, 3])
        }))
    );
    return transformers;
});

const createTerm = async (lm, memory, termKey) => {
    const term = await lm.bootstrapTerm(termKey);
    memory.addTerm(term);
    return term;
};

describe('Reasoner Integration Test', () => {
    let system, reasoner, memory, lm;

    beforeEach(() => {
        system = SystemFactory.createSystem({
            reasoner: {
                strategy: 'BruteForce'
            }
        });
        reasoner = system.reasoner;
        memory = system.memory;
        lm = system.lm;
        jest.spyOn(lm, 'bootstrapTerm').mockImplementation(async termKey => new Term(termKey, [], 1));
    });

    test('should perform modus ponens', async () => {
        const termA = await createTerm(lm, memory, 'cat');
        await createTerm(lm, memory, 'mammal');
        const task1 = new Task(parseTerm('(cat ==> mammal)'), '.');
        const task2 = new Task(termA, '.');

        const derivedTasks = reasoner.performInference([task1, task2]);
        expect(derivedTasks.some(t => t.termKey === 'mammal')).toBe(true);
    });

    test('should perform inheritance chaining', async () => {
        await createTerm(lm, memory, 'cat');
        await createTerm(lm, memory, 'mammal');
        await createTerm(lm, memory, 'animal');
        const task1 = new Task(parseTerm('(cat --> mammal)'), '.');
        const task2 = new Task(parseTerm('(mammal --> animal)'), '.');

        const derivedTasks = reasoner.performInference([task1, task2]);
        expect(derivedTasks.some(t => t.termKey === '(cat --> animal)')).toBe(true);
    });
});
