import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import Task from '../../core/core/Task.js';
import Term from '../../core/core/Term.js';
import * as logger from '../../core/utils/logger.js';

describe('Task - Edge Cases', () => {
    let errorSpy;

    beforeEach(() => {
        errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        errorSpy.mockRestore();
    });

    test('should handle invalid truthValue objects with NaN values', () => {
        const term = new Term('cat');
        const truthValue = {
            frequency: NaN,
            confidence: 0.5
        };
        const task = new Task(term, '.', truthValue);
        expect(task.state.truthValue.frequency).toBe(1.0);
        expect(task.state.truthValue.confidence).toBe(0.9);
    });

    test('should handle invalid truthValue objects with Infinity values', () => {
        const term = new Term('cat');
        const truthValue = {
            frequency: Infinity,
            confidence: 0.5
        };
        const task = new Task(term, '.', truthValue);
        expect(task.state.truthValue.frequency).toBe(1.0);
        expect(task.state.truthValue.confidence).toBe(0.5);
    });

    test('should handle invalid truthValue objects with negative values', () => {
        const term = new Term('cat');
        const truthValue = {
            frequency: -0.5,
            confidence: -0.2
        };
        const task = new Task(term, '.', truthValue);
        expect(task.state.truthValue.frequency).toBe(0.0);
        expect(task.state.truthValue.confidence).toBe(0.0);
    });

    test('should handle invalid truthValue objects with values > 1', () => {
        const term = new Term('cat');
        const truthValue = {
            frequency: 1.5,
            confidence: 1.2
        };
        const task = new Task(term, '.', truthValue);
        expect(task.state.truthValue.frequency).toBe(1.0);
        expect(task.state.truthValue.confidence).toBe(1.0);
    });

    test('should handle malformed term strings', () => {
        expect(() => new Task('(invalid', '.')).toThrow("Failed to parse term: '(invalid'.");
        expect(() => new Task('also_invalid)', '.')).toThrow("Failed to parse term: 'also_invalid)'.");
        expect(() => new Task('', '.')).toThrow('Task term must be a non-empty string or a valid object with a key property');
    });

    test('should handle invalid punctuation', () => {
        const term = new Term('cat');
        expect(() => new Task(term, 'x')).toThrow('Task punctuation must be one of: ., !, ?');
        expect(() => new Task(term, '')).toThrow('Task punctuation must be one of: ., !, ?');
        expect(() => new Task(term, null)).toThrow('Task punctuation must be one of: ., !, ?');
    });

    test('should handle null and undefined terms', () => {
        expect(() => new Task(null, '.')).toThrow('Task term must be a non-empty string or a valid object with a key property');
        expect(() => new Task(undefined, '.')).toThrow('Task term must be a non-empty string or a valid object with a key property');
    });

    test('should handle extreme weight values in truth value revision', () => {
        const term = new Term('cat');
        const task = new Task(term, '.');
        const evidence1 = {
            frequency: 0.8,
            confidence: 0.7
        };
        task.reviseTruthValue(evidence1, 0);
        const evidence2 = {
            frequency: 0.3,
            confidence: 0.9
        };
        task.reviseTruthValue(evidence2, 1);
        const evidence3 = {
            frequency: 0.5,
            confidence: 0.6
        };
        task.reviseTruthValue(evidence3, -0.5);
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
        expect(task1.equals(task2)).toBe(false);
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
        expect(str1).toContain('cat');
        expect(str1).toContain('.');
        expect(str1).toContain('0.800');
        expect(str1).toContain('0.700');
    });
});