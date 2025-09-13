import Reasoner from '../../src/reasoner/Reasoner.js';
import Memory from '../../src/memory/Memory.js';
import Task from '../../src/core/Task.js';
import Term from '../../src/core/Term.js';
import {parseTerm} from '../../src/parser/narseseParser.js';
import LM from '../../src/lm/LM.js';
import BruteForceStrategy from '../../src/reasoner/strategies/BruteForceStrategy.js';
import TemporalReasoner from '../../src/reasoner/TemporalReasoner.js';

jest.mock('../../src/lm/LM.js');
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
        // Use BruteForceStrategy for deterministic test results
        reasoner = new Reasoner({strategy: new BruteForceStrategy(), temporalReasoner: new TemporalReasoner()});
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

        const task1 = new Task(parseTerm('(cat ==> mammal)'), '.', {}, {});
        const task2 = new Task(termA, '.', {}, {});

        const derivedTasks = reasoner.performInference([task1, task2]);
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

        const derivedTasks = reasoner.performInference([task1, task2]);
        const derivedTask = derivedTasks.find(t => t.termKey === '(cat --> animal)');
        expect(derivedTask).toBeDefined();
    });
});
