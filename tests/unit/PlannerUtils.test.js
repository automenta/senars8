import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as PlannerUtils from '../../core/reasoner/utils/PlannerUtils.js';
import Term from '../../core/core/Term.js';
import { SystemCommands } from '../../core/system/SystemCommands.js';

// Mock Term to have a simple structure for testing
vi.mock('../../core/core/Term.js', () => ({
    default: vi.fn().mockImplementation(key => ({
        key,
        type: 'Atomic',
    })),
}));

describe('PlannerUtils', () => {
    let commandBus;

    beforeEach(() => {
        vi.clearAllMocks();
        commandBus = {
            request: vi.fn(),
        };
    });

    describe('findDecompositionMethods', () => {
        it('should return an empty array if no methods are found', async () => {
            const goalTerm = new Term('goal');
            commandBus.request.mockResolvedValue([]);
            await expect(PlannerUtils.findDecompositionMethods(goalTerm, commandBus)).resolves.toEqual([]);
            expect(commandBus.request).toHaveBeenCalledWith(SystemCommands.MEMORY_GET_IMPLICATIONS, 'goal');
        });

        it('should return the correct decomposition methods', async () => {
            const goalTerm = new Term('goal');
            const method1 = new Term('(goal ==> action1)');
            commandBus.request.mockResolvedValue([method1]);
            await expect(PlannerUtils.findDecompositionMethods(goalTerm, commandBus)).resolves.toEqual([method1]);
            expect(commandBus.request).toHaveBeenCalledWith(SystemCommands.MEMORY_GET_IMPLICATIONS, 'goal');
        });
    });

    describe('extractSubTasksFromMethod', () => {
        it('should return null for a null methodTerm', () => {
            expect(PlannerUtils.extractSubTasksFromMethod(null)).toBeNull();
        });

        it('should return an array with the term itself if not a SequentialConjunction', () => {
            const term = new Term('atomic');
            expect(PlannerUtils.extractSubTasksFromMethod(term)).toEqual([term]);
        });

        it('should extract subtasks from a SequentialConjunction', () => {
            const subTask1 = new Term('sub1');
            const subTask2 = new Term('sub2');
            const methodTerm = {
                type: 'SequentialConjunction',
                terms: [subTask1, subTask2]
            };
            expect(PlannerUtils.extractSubTasksFromMethod(methodTerm)).toEqual([subTask1, subTask2]);
        });
    });

    describe('isAchieved', () => {
        const confidenceThreshold = 0.8;

        it('should return false if term is null', async () => {
            await expect(PlannerUtils.isAchieved(null, commandBus, confidenceThreshold)).resolves.toBe(false);
        });

        it('should return false if no beliefs are found', async () => {
            const term = new Term('goal');
            commandBus.request.mockResolvedValue([]);
            await expect(PlannerUtils.isAchieved(term, commandBus, confidenceThreshold)).resolves.toBe(false);
            expect(commandBus.request).toHaveBeenCalledWith(SystemCommands.MEMORY_QUERY_TASKS, {
                termKey: 'goal',
                punctuation: '.',
                minConfidence: confidenceThreshold
            });
        });

        it('should return true if beliefs are found', async () => {
            const term = new Term('goal');
            const belief = { state: { truthValue: { confidence: 0.9 } } };
            commandBus.request.mockResolvedValue([belief]);
            await expect(PlannerUtils.isAchieved(term, commandBus, confidenceThreshold)).resolves.toBe(true);
        });
    });

    describe('arePreconditionsMet', () => {
        const preconditionConfidenceThreshold = 0.7;

        it('should return true for empty preconditions', async () => {
            await expect(PlannerUtils.arePreconditionsMet([], commandBus, preconditionConfidenceThreshold)).resolves.toBe(true);
        });

        it('should return true if all preconditions are met', async () => {
            const precond1 = new Term('precond1');
            const precond2 = new Term('precond2');
            commandBus.request.mockResolvedValue([{ state: { truthValue: { confidence: 0.8 } } }]);
            await expect(PlannerUtils.arePreconditionsMet([precond1, precond2], commandBus, preconditionConfidenceThreshold)).resolves.toBe(true);
            expect(commandBus.request).toHaveBeenCalledTimes(2);
        });

        it('should return false if any precondition is not met', async () => {
            const precond1 = new Term('precond1');
            const precond2 = new Term('precond2');
            commandBus.request
                .mockResolvedValueOnce([{ state: { truthValue: { confidence: 0.8 } } }]) // For precond1
                .mockResolvedValueOnce([]); // For precond2
            await expect(PlannerUtils.arePreconditionsMet([precond1, precond2], commandBus, preconditionConfidenceThreshold)).resolves.toBe(false);
            expect(commandBus.request).toHaveBeenCalledTimes(2);
        });
    });
});