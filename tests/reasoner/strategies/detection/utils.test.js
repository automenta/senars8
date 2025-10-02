import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {analyzeNegationConflict, analyzeSetLikeConflict} from '../../../../core/reasoner/strategies/detection/utils.js';
import Term from '../../../../core/core/Term.js';
import Task from '../../../../core/core/Task.js';
import {CONTRADICTION_TYPES} from '../../../../core/reasoner/contradiction-types.js';
import * as logger from '../../../../core/utils/logger.js';

describe('Detection Strategy Utils', () => {
    let errorSpy;

    beforeEach(() => {
        errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        errorSpy.mockRestore();
    });

    describe('analyzeNegationConflict', () => {
        it('should detect a conflict between a statement and its negation', () => {
            const term1 = new Term('a --> b');
            const parsed1 = {
                type: 'Statement',
                term: term1
            };
            const task1 = new Task(term1, '.');

            const term2 = new Term('~ (a --> b)');
            const parsed2 = {
                type: 'Negation',
                term: new Term('a --> b')
            };
            const task2 = new Task(term2, '.');

            const conflict = analyzeNegationConflict(task1, task2, parsed1, parsed2, 'Statement', CONTRADICTION_TYPES.DIRECT_NEGATION);
            expect(conflict).not.toBeNull();
            expect(conflict.type).toBe(CONTRADICTION_TYPES.DIRECT_NEGATION);
        });

        it('should not detect a conflict if the types do not match', () => {
            const term1 = new Term('a --> b');
            const parsed1 = {
                type: 'Statement',
                term: term1
            };
            const task1 = new Task(term1, '.');

            const term2 = new Term('c --> d');
            const parsed2 = {
                type: 'Statement',
                term: term2
            };
            const task2 = new Task(term2, '.');

            const conflict = analyzeNegationConflict(task1, task2, parsed1, parsed2, 'Statement', CONTRADICTION_TYPES.DIRECT_NEGATION);
            expect(conflict).toBeNull();
        });
    });

    describe('analyzeSetLikeConflict', () => {
        it('should detect a conflict between two sets with different sizes', () => {
            const term1 = new Term('{a, b}');
            const parsed1 = {
                type: 'IntensionalSet',
                terms: [new Term('a'), new Term('b')]
            };
            const task1 = new Task(term1, '.');

            const term2 = new Term('{a, b, c}');
            const parsed2 = {
                type: 'IntensionalSet',
                terms: [new Term('a'), new Term('b'), new Term('c')]
            };
            const task2 = new Task(term2, '.');

            const conflict = analyzeSetLikeConflict(task1, task2, parsed1, parsed2, 'IntensionalSet', CONTRADICTION_TYPES.INTENSIONAL_SET_CONFLICT, 'Intensional set conflict');
            expect(conflict).not.toBeNull();
            expect(conflict.type).toBe(CONTRADICTION_TYPES.INTENSIONAL_SET_CONFLICT);
        });

        it('should detect a conflict between two sets with different terms', () => {
            const term1 = new Term('{a, b}');
            const parsed1 = {
                type: 'IntensionalSet',
                terms: [new Term('a'), new Term('b')]
            };
            const task1 = new Task(term1, '.');

            const term2 = new Term('{a, c}');
            const parsed2 = {
                type: 'IntensionalSet',
                terms: [new Term('a'), new Term('c')]
            };
            const task2 = new Task(term2, '.');

            const conflict = analyzeSetLikeConflict(task1, task2, parsed1, parsed2, 'IntensionalSet', CONTRADICTION_TYPES.INTENSIONAL_SET_CONFLICT, 'Intensional set conflict');
            expect(conflict).not.toBeNull();
            expect(conflict.type).toBe(CONTRADICTION_TYPES.INTENSIONAL_SET_CONFLICT);
        });

        it('should not detect a conflict between two identical sets', () => {
            const term1 = new Term('{a, b}');
            const parsed1 = {
                type: 'IntensionalSet',
                terms: [new Term('a'), new Term('b')]
            };
            const task1 = new Task(term1, '.');

            const term2 = new Term('{a, b}');
            const parsed2 = {
                type: 'IntensionalSet',
                terms: [new Term('a'), new Term('b')]
            };
            const task2 = new Task(term2, '.');

            const conflict = analyzeSetLikeConflict(task1, task2, parsed1, parsed2, 'IntensionalSet', CONTRADICTION_TYPES.INTENSIONAL_SET_CONFLICT, 'Intensional set conflict');
            expect(conflict).toBeNull();
        });
    });
});
