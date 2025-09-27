import {beforeEach, describe, expect, it, vi} from 'vitest';
import * as PlannerUtils from '../../core/reasoner/utils/PlannerUtils.js';
import Term from '../../core/core/Term.js';

vi.mock('../../core/memory/Memory.js', () => ({
    default: vi.fn().mockImplementation(() => ({
        indexer: {
            implicationIndex: new Map(),
            beliefIndex: new Map(),
        }
    })),
}));

const {default: Memory} = await import('../../core/memory/Memory.js');

describe('PlannerUtils', () => {
    let memory;

    beforeEach(() => {
        memory = new Memory();
        memory.indexer = {
            implicationIndex: new Map(),
            beliefIndex: new Map(),
        };
    });

    describe('findDecompositionMethods', () => {
        it('should return an empty array if no methods are found', () => {
            const goalTerm = new Term('goal');
            expect(PlannerUtils.findDecompositionMethods(goalTerm, memory)).toEqual([]);
        });

        it('should return the correct decomposition methods', () => {
            const goalTerm = new Term('goal');
            const method1 = new Term('(goal ==> action1)');
            memory.indexer.implicationIndex.set('goal', [method1]);
            expect(PlannerUtils.findDecompositionMethods(goalTerm, memory)).toEqual([method1]);
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
        const config = {
            confidenceThreshold: 0.8
        };

        it('should return false if term is null', () => {
            expect(PlannerUtils.isAchieved(null, memory, config)).toBe(false);
        });

        it('should return false if no beliefs are found', () => {
            const term = new Term('goal');
            expect(PlannerUtils.isAchieved(term, memory, config)).toBe(false);
        });

        it('should return false if belief confidence is below threshold', () => {
            const term = new Term('goal');
            memory.indexer.beliefIndex.set('goal', [{
                state: {
                    truthValue: {
                        confidence: 0.7
                    }
                }
            }]);
            expect(PlannerUtils.isAchieved(term, memory, config)).toBe(false);
        });

        it('should return true if belief confidence is at or above threshold', () => {
            const term = new Term('goal');
            memory.indexer.beliefIndex.set('goal', [{
                state: {
                    truthValue: {
                        confidence: 0.8
                    }
                }
            }]);
            expect(PlannerUtils.isAchieved(term, memory, config)).toBe(true);
        });
    });

    describe('arePreconditionsMet', () => {
        const config = {
            preconditionConfidenceThreshold: 0.7
        };

        it('should return true for empty preconditions', () => {
            expect(PlannerUtils.arePreconditionsMet([], memory, config)).toBe(true);
        });

        it('should return true if all preconditions are met', () => {
            const precond1 = new Term('precond1');
            const precond2 = new Term('precond2');
            memory.indexer.beliefIndex.set('precond1', [{
                state: {
                    truthValue: {
                        confidence: 0.8
                    }
                }
            }]);
            memory.indexer.beliefIndex.set('precond2', [{
                state: {
                    truthValue: {
                        confidence: 0.9
                    }
                }
            }]);
            expect(PlannerUtils.arePreconditionsMet([precond1, precond2], memory, config)).toBe(true);
        });

        it('should return false if any precondition is not met', () => {
            const precond1 = new Term('precond1');
            const precond2 = new Term('precond2');
            memory.indexer.beliefIndex.set('precond1', [{
                state: {
                    truthValue: {
                        confidence: 0.8
                    }
                }
            }]);
            expect(PlannerUtils.arePreconditionsMet([precond1, precond2], memory, config)).toBe(false);
        });
    });
});
