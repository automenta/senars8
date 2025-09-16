import * as PlannerUtils from '../../src/reasoner/utils/PlannerUtils.js';
import Term from '../../src/core/Term.js';
import Memory from '../../src/memory/Memory.js';

// Mock Term and Memory for testing purposes
jest.mock('../../src/core/Term.js', () => {
    return jest.fn().mockImplementation(key => {
        const termInstance = {
            key,
            type: 'Atomic',
            subject: null,
            predicate: null,
            terms: [],
            equals: jest.fn(otherTerm => otherTerm && termInstance.key === otherTerm.key)
        };
        return new Proxy(termInstance, {
            set: (target, prop, value) => {
                target[prop] = value;
                return true;
            }
        });
    });
});
jest.mock('../../src/memory/Memory.js');

describe('PlannerUtils', () => {
    let memory;
    let config;

    beforeEach(() => {
        jest.clearAllMocks();

        memory = new Memory();
        memory.implicationIndex = new Map();
        memory.beliefIndex = new Map();

        config = {
            confidenceThreshold: 0.9,
            preconditionConfidenceThreshold: 0.8
        };
    });

    describe('findDecompositionMethods', () => {
        it('should return methods from the implication index', () => {
            const goalTerm = new Term('goal');
            const methods = [{id: 'method1'}, {id: 'method2'}];
            memory.implicationIndex.set(goalTerm.key, methods);
            const result = PlannerUtils.findDecompositionMethods(goalTerm, memory);
            expect(result).toEqual(methods);
        });

        it('should return an empty array if no methods are found', () => {
            const goalTerm = new Term('goal_without_methods');
            const result = PlannerUtils.findDecompositionMethods(goalTerm, memory);
            expect(result).toEqual([]);
        });
    });

    describe('extractSubTasksFromMethod', () => {
        it('should return the terms of a SequentialConjunction', () => {
            const methodTerm = new Term('method');
            methodTerm.type = 'SequentialConjunction';
            methodTerm.terms = [new Term('sub1'), new Term('sub2')];
            const result = PlannerUtils.extractSubTasksFromMethod(methodTerm);
            expect(result).toEqual(methodTerm.terms);
        });

        it('should return an array with the term itself if not a SequentialConjunction', () => {
            const methodTerm = new Term('atomic_method');
            const result = PlannerUtils.extractSubTasksFromMethod(methodTerm);
            expect(result).toEqual([methodTerm]);
        });

        it('should return null if the method term is null', () => {
            const result = PlannerUtils.extractSubTasksFromMethod(null);
            expect(result).toBeNull();
        });
    });

    describe('isAchieved', () => {
        it('should return true if a belief meets the confidence threshold', () => {
            const term = new Term('achieved_term');
            memory.beliefIndex.set(term.key, [{state: {truthValue: {confidence: 0.95}}}]);
            const result = PlannerUtils.isAchieved(term, memory, config);
            expect(result).toBe(true);
        });

        it('should return false if a belief is below the confidence threshold', () => {
            const term = new Term('unachieved_term');
            memory.beliefIndex.set(term.key, [{state: {truthValue: {confidence: 0.5}}}]);
            const result = PlannerUtils.isAchieved(term, memory, config);
            expect(result).toBe(false);
        });

        it('should return false if no belief is found', () => {
            const term = new Term('non_existent_term');
            const result = PlannerUtils.isAchieved(term, memory, config);
            expect(result).toBe(false);
        });
    });

    describe('arePreconditionsMet', () => {
        it('should return true if all preconditions are met', () => {
            const pre1 = new Term('pre1');
            const pre2 = new Term('pre2');
            memory.beliefIndex.set(pre1.key, [{state: {truthValue: {confidence: 0.85}}}]);
            memory.beliefIndex.set(pre2.key, [{state: {truthValue: {confidence: 0.9}}}]);
            const result = PlannerUtils.arePreconditionsMet([pre1, pre2], memory, config);
            expect(result).toBe(true);
        });

        it('should return false if any precondition is not met', () => {
            const pre1 = new Term('pre1');
            const pre2 = new Term('pre2_unmet');
            memory.beliefIndex.set(pre1.key, [{state: {truthValue: {confidence: 0.9}}}]);
            memory.beliefIndex.set(pre2.key, [{state: {truthValue: {confidence: 0.7}}}]);
            const result = PlannerUtils.arePreconditionsMet([pre1, pre2], memory, config);
            expect(result).toBe(false);
        });

        it('should return false if any precondition belief does not exist', () => {
            const pre1 = new Term('pre1');
            const pre2 = new Term('pre2_nonexistent');
            memory.beliefIndex.set(pre1.key, [{state: {truthValue: {confidence: 0.9}}}]);
            const result = PlannerUtils.arePreconditionsMet([pre1, pre2], memory, config);
            expect(result).toBe(false);
        });
    });
});
