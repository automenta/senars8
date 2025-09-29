import {beforeEach, describe, expect, test, vi} from 'vitest';
import Task from '../../core/core/Task.js';
import Term from '../../core/core/Term.js';
import {parseTerm} from '../../core/parser/narseseParser.js';

vi.mock('@xenova/transformers', () => ({
    pipeline: vi.fn(async () =>
        vi.fn(() => ({
            data: new Float32Array([1, 2, 3])
        }))
    ),
    env: {},
}));

const {default: SystemFactory} = await import('../../core/system/SystemFactory.js');

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
        vi.spyOn(lm, 'bootstrapTerm').mockImplementation(async termKey => new Term(termKey, [], 1));
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