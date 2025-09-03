const { cosineSimilarity, calculateImportance } = require('../src/system/Priority');
const Task = require('../src/core/Task');
const Term = require('../src/core/Term');
const Memory = require('../src/memory/Memory');
const LM = require('../src/lm/LM');

jest.mock('../src/lm/LM'); // Automatically mock the LM module

describe('Priority Calculation', () => {

    describe('cosineSimilarity', () => {
        it('should return 1 for identical vectors', () => {
            const vec = [1, 2, 3];
            expect(cosineSimilarity(vec, vec)).toBeCloseTo(1);
        });

        it('should return 0 for orthogonal vectors', () => {
            const vecA = [1, 0];
            const vecB = [0, 1];
            expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0);
        });

        it('should return -1 for opposite vectors', () => {
            const vecA = [1, 2, 3];
            const vecB = [-1, -2, -3];
            expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1);
        });

        it('should handle zero vectors gracefully', () => {
            const vecA = [0, 0, 0];
            const vecB = [1, 2, 3];
            expect(cosineSimilarity(vecA, vecB)).toBe(0);
        });
    });

    describe('calculateImportance', () => {
        let memory;
        let mockLmInstance;

        beforeEach(() => {
            LM.mockClear();
            mockLmInstance = new LM();
            memory = new Memory(mockLmInstance);
        });

        it('should return high importance for a task similar to a drive', () => {
            const driveTerm = new Term('AcquireKnowledge', [1, 0], 1);
            const taskTerm = new Term('learn-physics', [0.9, 0.1], 1);
            const someTask = new Task('learn-physics', '?');

            memory.drives = [new Task('AcquireKnowledge', '!')];
            memory.addTerm(driveTerm);
            memory.addTerm(taskTerm);

            const importance = calculateImportance(someTask, memory);
            expect(importance).toBeGreaterThan(0.9);
        });

        it('should return low importance for a task dissimilar to all drives', () => {
            const driveTerm = new Term('AcquireKnowledge', [1, 0], 1);
            const taskTerm = new Term('eat-pizza', [-0.9, 0.1], 1);
            const someTask = new Task('eat-pizza', '!');

            memory.drives = [new Task('AcquireKnowledge', '!')];
            memory.addTerm(driveTerm);
            memory.addTerm(taskTerm);

            const importance = calculateImportance(someTask, memory);
            expect(importance).toBeLessThan(0.1);
        });

        it('should return default importance if task has no term or embedding', () => {
            const someTask = new Task('unknown-term', '?');
            memory.drives = [new Task('AcquireKnowledge', '!')];

            const importance = calculateImportance(someTask, memory);
            expect(importance).toBe(0.5);
        });
    });
});
