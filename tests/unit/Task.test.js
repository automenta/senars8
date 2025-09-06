const Task = require('../../src/core/Task');
const Term = require('../../src/core/Term');

jest.mock('../../src/core/Term', () => {
    return jest.fn().mockImplementation((key) => {
        return {key: key};
    });
});

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
        expect(task.state.truthValue).toEqual({frequency: 1.0, confidence: 0.9});
    });

    test('should create a new Task object with custom truth value and stamp', () => {
        const term = new Term('cat');
        const truthValue = {frequency: 0.5, confidence: 0.5};
        const stamp = {creationTime: 123, occurrenceTime: 456};
        const task = new Task(term, '!', truthValue, stamp);
        expect(task).toBeInstanceOf(Task);
        expect(task.term.key).toBe(term.key);
        expect(task.termKey).toBe('cat');
        expect(task.punctuation).toBe('!');
        expect(task.state.truthValue).toEqual(truthValue);
        expect(task.state.stamp).toEqual(stamp);
    });

    test('should throw an error if term is invalid', () => {
        expect(() => new Task(null, '.')).toThrow('Invalid Task arguments');
        expect(() => new Task({}, '.')).toThrow('Invalid Task arguments');
        expect(() => new Task({key: ''}, '.')).toThrow('Invalid Task arguments');
    });

    test('should throw an error if punctuation is invalid', () => {
        const term = new Term('cat');
        expect(() => new Task(term, 'a')).toThrow('Invalid Task arguments');
    });
});
