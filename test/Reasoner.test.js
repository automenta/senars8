const { performInference } = require('../src/reasoner/Reasoner');
const Task = require('../src/core/Task');
const Memory = require('../src/memory/Memory');
const LM = require('../src/lm/LM');

jest.mock('../src/lm/LM'); // Mock the LM module

// Mock the NarseseParser
jest.mock('../src/reasoner/NarseseParser', () => ({
    parse: jest.fn((termKey) => {
        if (termKey.startsWith('(') && termKey.endsWith(')')) {
            if (termKey.includes('==>')) {
                const parts = termKey.slice(1, -1).split('==>').map(s => s.trim());
                return { type: 'implication', subject: parts[0], predicate: parts[1] };
            }
        }
        return { type: 'atomic', term: termKey };
    }),
}));


describe('Reasoner', () => {

    let memory;
    let mockLmInstance;

    beforeEach(() => {
        LM.mockClear();
        mockLmInstance = new LM();
        memory = new Memory(mockLmInstance);
    });

    describe('Deduction Rule', () => {

        it('should derive a new task via modus ponens', () => {
            const premiseTask = new Task('A', '.');
            const implicationTask = new Task('(A ==> B)', '.');

            memory.addTasks([premiseTask, implicationTask]);
            const focusSet = [premiseTask, implicationTask];

            const derivedTasks = performInference(focusSet, memory);

            expect(derivedTasks).toHaveLength(1);
            const derived = derivedTasks[0];
            expect(derived.termKey).toBe('B');
            expect(derived.punctuation).toBe('.');
            expect(derived.derivation).toEqual({
                rule: 'deduction',
                premises: [premiseTask.id, implicationTask.id],
            });
        });

        it('should calculate the new truth value based on premises', () => {
            const premiseTask = new Task('A', '.', { frequency: 1.0, confidence: 0.8 });
            const implicationTask = new Task('(A ==> B)', '.', { frequency: 1.0, confidence: 0.9 });

            memory.addTasks([premiseTask, implicationTask]);
            const focusSet = [premiseTask, implicationTask];

            const derivedTasks = performInference(focusSet, memory);

            expect(derivedTasks[0].state.truthValue.confidence).toBeCloseTo(0.72);
        });

        it('should not derive a task if the conclusion already exists in memory', () => {
            const premiseTask = new Task('A', '.');
            const implicationTask = new Task('(A ==> B)', '.');
            const existingConclusion = new Task('B', '.');

            memory.addTasks([premiseTask, implicationTask, existingConclusion]);
            const focusSet = [premiseTask, implicationTask];

            const derivedTasks = performInference(focusSet, memory);

            expect(derivedTasks).toHaveLength(0);
        });

    });
});
