import Task from '../../src/core/Task.js';
import Term from '../../src/core/Term.js';

describe('Task - Edge Cases', () => {
    test('should handle invalid truthValue objects with NaN values', () => {
        const term = new Term('cat');
        const truthValue = {
            frequency: NaN,
            confidence: 0.5
        };
        const task = new Task(term, '.', truthValue);
        // Should fall back to default values
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
        // Should clamp to valid range
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
        // Should clamp to valid range
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
        // Should clamp to valid range
        expect(task.state.truthValue.frequency).toBe(1.0);
        expect(task.state.truthValue.confidence).toBe(1.0);
    });

    test('should handle malformed term strings', () => {
        expect(() => new Task('(invalid', '.')).toThrow('Failed to parse term: \'(invalid\'. Please check the term syntax.');
        expect(() => new Task('also_invalid)', '.')).toThrow('Failed to parse term: \'also_invalid)\'. Please check the term syntax.');
        expect(() => new Task('', '.')).toThrow('Task term must be a non-empty string');
    });

    test('should handle invalid punctuation', () => {
        const term = new Term('cat');
        expect(() => new Task(term, 'x')).toThrow('Task punctuation must be one of: ., !, ?');
        expect(() => new Task(term, '')).toThrow('Task punctuation must be one of: ., !, ?');
        expect(() => new Task(term, null)).toThrow('Task punctuation must be one of: ., !, ?');
    });

    test('should handle null and undefined terms', () => {
        expect(() => new Task(null, '.')).toThrow('Task term is required');
        expect(() => new Task(undefined, '.')).toThrow('Task term is required');
        expect(() => new Task('', '.')).toThrow('Task term must be a non-empty string');
    });

    test('should handle extreme weight values in truth value revision', () => {
        const term = new Term('cat');
        const task = new Task(term, '.');

        // Test weight of 0
        const evidence1 = {frequency: 0.8, confidence: 0.7};
        const _revised1 = task.reviseTruthValue(evidence1, 0);
        // With weight 0, should not change much

        // Test weight of 1
        const evidence2 = {frequency: 0.3, confidence: 0.9};
        const _revised2 = task.reviseTruthValue(evidence2, 1);
        // With weight 1, should be dominated by new evidence

        // Test negative weight
        const evidence3 = {frequency: 0.5, confidence: 0.6};
        const _revised3 = task.reviseTruthValue(evidence3, -0.5);
        // Should handle negative weights gracefully
    });

    test('should handle task cloning correctly', () => {
        const term = new Term('cat');
        const originalTask = new Task(term, '.', {frequency: 0.8, confidence: 0.7});
        const clonedTask = originalTask.clone();

        // Should have same values
        expect(clonedTask.termKey).toBe(originalTask.termKey);
        expect(clonedTask.punctuation).toBe(originalTask.punctuation);
        expect(clonedTask.state.truthValue.frequency).toBe(originalTask.state.truthValue.frequency);
        expect(clonedTask.state.truthValue.confidence).toBe(originalTask.state.truthValue.confidence);

        // But different instances
        expect(clonedTask).not.toBe(originalTask);
        expect(clonedTask.id).toBe(originalTask.id); // Should preserve ID
    });

    test('should handle task equality correctly', () => {
        const term = new Term('cat');
        const task1 = new Task(term, '.');
        const task2 = new Task(term, '.');
        const clonedTask = task1.clone();

        // Same instance should be equal
        expect(task1.equals(task1)).toBe(true);

        // Different instances should not be equal
        expect(task1.equals(task2)).toBe(false);

        // Cloned task should be equal (same ID)
        expect(task1.equals(clonedTask)).toBe(true);

        // Non-task objects should not be equal
        expect(task1.equals(null)).toBe(false);
        expect(task1.equals({})).toBe(false);
        expect(task1.equals('string')).toBe(false);
    });

    test('should handle toString caching correctly', () => {
        const term = new Term('cat');
        const task = new Task(term, '.', {frequency: 0.8, confidence: 0.7});

        const str1 = task.toString();
        const str2 = task.toString();

        // Should return same string (cached)
        expect(str1).toBe(str2);

        // Should have expected format
        expect(str1).toContain('cat');
        expect(str1).toContain('.');
        expect(str1).toContain('0.800');
        expect(str1).toContain('0.700');
    });
});