import {describe, expect, test} from 'vitest';
import Task from '../../core/core/Task.js';
import Term from '../../core/core/Term.js';
import {expectTruthValue} from '../shared/test-utils.js';
import {SYSTEM_CONSTANTS} from '../../core/config/constants.js';

describe('Task', () => {
    test('should create a new Task object', () => {
        const term = new Term('cat');
        const task = new Task(term, '.');
        expect(task).toBeInstanceOf(Task);
        expect(task.term.key).toBe(term.key);
        expect(task.termKey).toBe('cat');
        expect(task.punctuation).toBe('.');
        expect(task.state.priority).toBe(SYSTEM_CONSTANTS.DEFAULT_PRIORITIES.DEFAULT);
        expectTruthValue(task.state.truthValue, SYSTEM_CONSTANTS.DEFAULT_TRUTH_VALUES.HIGH.frequency, SYSTEM_CONSTANTS.DEFAULT_TRUTH_VALUES.HIGH.confidence);
    });

    test('should create a new Task object with custom truth value and stamp', () => {
        const term = new Term('cat');
        const truthValue = {
            frequency: 0.5,
            confidence: 0.5
        };
        const stamp = {
            creationTime: 123n, // Using BigInt for consistency with actual implementation
            occurrenceTime: 456n
        };
        const task = new Task(term, '!', truthValue, stamp);
        expect(task).toBeInstanceOf(Task);
        expect(task.term.key).toBe(term.key);
        expect(task.termKey).toBe('cat');
        expect(task.punctuation).toBe('!');
        expectTruthValue(task.state.truthValue, 0.5, 0.5);
        expect(task.state.stamp.creationTime).toEqual(stamp.creationTime);
        expect(task.state.stamp.occurrenceTime).toEqual(stamp.occurrenceTime);
        expect(task.state.stamp.lastAccessed).toEqual(expect.any(BigInt));
    });

    test.each([
        [null],
        [undefined],
        [''],
        [{}],
        [{key: ''}],
    ])('should throw an error for invalid term: %p', (term) => {
        const expectedError = 'Task term must be a non-empty string or a valid object with a key property';
        expect(() => new Task(term, '.')).toThrow(expectedError);
    });

    test.each([
        ['a'],
        ['x'],
        [''],
        [null],
    ])('should throw an error for invalid punctuation: %p', (punctuation) => {
        const term = new Term('cat');
        expect(() => new Task(term, punctuation)).toThrow('Task punctuation must be one of: ., !, ?');
    });

    describe('TruthValue Handling', () => {
        test.each([
            [{frequency: NaN, confidence: 0.5}, 1.0, 0.9],
            [{frequency: Infinity, confidence: 0.5}, 1.0, 0.5],
            [{frequency: -0.5, confidence: -0.2}, 0.0, 0.0],
            [{frequency: 1.5, confidence: 1.2}, 1.0, 1.0],
        ])('should handle invalid truthValue object %p', (truthValue, expectedFreq, expectedConf) => {
            const term = new Term('cat');
            const task = new Task(term, '.', truthValue);
            expect(task.state.truthValue.frequency).toBe(expectedFreq);
            expect(task.state.truthValue.confidence).toBe(expectedConf);
        });
    });

    test('should handle extreme weight values in truth value revision', () => {
        const term = new Term('cat');
        const task = new Task(term, '.');
        task.reviseTruthValue({frequency: 0.8, confidence: 0.7}, 0);
        task.reviseTruthValue({frequency: 0.3, confidence: 0.9}, 1);
        task.reviseTruthValue({frequency: 0.5, confidence: 0.6}, -0.5);
        // No assertion, just checking it doesn't throw
    });

    test('should handle task cloning correctly', () => {
        const term = new Term('cat');
        const originalTask = new Task(term, '.', {
            frequency: 0.8,
            confidence: 0.7
        });
        const clonedTask = originalTask.clone();
        expect(clonedTask.termKey).toBe(originalTask.termKey);
        expect(clonedTask.punctuation).toBe(originalTask.punctuation);
        expect(clonedTask.state.truthValue.frequency).toBe(originalTask.state.truthValue.frequency);
        expect(clonedTask.state.truthValue.confidence).toBe(originalTask.state.truthValue.confidence);
        expect(clonedTask).not.toBe(originalTask);
        expect(clonedTask.id).toBe(originalTask.id);
    });

    test('should handle task equality correctly', () => {
        const term = new Term('cat');
        const task1 = new Task(term, '.');
        const task2 = new Task(term, '.');
        const clonedTask = task1.clone();
        expect(task1.equals(task1)).toBe(true);
        expect(task1.equals(task2)).toBe(false); // Different IDs
        expect(task1.equals(clonedTask)).toBe(true);
        expect(task1.equals(null)).toBe(false);
        expect(task1.equals({})).toBe(false);
        expect(task1.equals('string')).toBe(false);
    });

    test('should handle toString caching correctly', () => {
        const term = new Term('cat');
        const task = new Task(term, '.', {
            frequency: 0.8,
            confidence: 0.7
        });
        const str1 = task.toString();
        const str2 = task.toString();
        expect(str1).toBe(str2);
        expect(str1).toContain('cat. %0.800;0.700%');
    });
});