import {beforeEach, describe, expect, jest, test} from '@jest/globals';
import Task from '../../core/core/Task.js';

jest.unstable_mockModule('../../core/core/Term.js', () => ({
    default: jest.fn().mockImplementation(key => ({
        key
    })),
}));

const {default: Term} = await import('../../core/core/Term.js');

describe('Task', () => {
    beforeEach(() => {
        Term.mockClear();
    });

    test('should create a new Task object', () => {
        const term = new Term('cat');
        const task = new Task(term, '.');
        expect(task).toBeInstanceOf(Task);
        expect(task.term.key).toBe(term.key);
        expect(task.termKey).toBe('cat');
        expect(task.punctuation).toBe('.');
        expect(task.state.priority).toBe(0);
        expect(task.state.truthValue).toEqual({
            frequency: 1.0,
            confidence: 0.9
        });
    });

    test('should create a new Task object with custom truth value and stamp', () => {
        const term = new Term('cat');
        const truthValue = {
            frequency: 0.5,
            confidence: 0.5
        };
        const stamp = {
            creationTime: 123,
            occurrenceTime: 456
        };
        const task = new Task(term, '!', truthValue, stamp);
        expect(task).toBeInstanceOf(Task);
        expect(task.term.key).toBe(term.key);
        expect(task.termKey).toBe('cat');
        expect(task.punctuation).toBe('!');
        expect(task.state.truthValue).toEqual(truthValue);
        expect(task.state.stamp.creationTime).toEqual(stamp.creationTime);
        expect(task.state.stamp.occurrenceTime).toEqual(stamp.occurrenceTime);
        expect(task.state.stamp.lastAccessed).toEqual(expect.any(BigInt));
    });

    test('should throw an error if term is invalid', () => {
        const expectedError = 'Task term must be a non-empty string or a valid object with a key property';
        expect(() => new Task(null, '.')).toThrow(expectedError);
        expect(() => new Task({}, '.')).toThrow(expectedError);
        expect(() => new Task({
            key: ''
        }, '.')).toThrow(expectedError);
    });

    test('should throw an error if punctuation is invalid', () => {
        const term = new Term('cat');
        expect(() => new Task(term, 'a')).toThrow('Task punctuation must be one of: ., !, ?');
    });
});
