const TimeBasedForgettingStrategy = require('../../src/memory/strategies/TimeBasedForgettingStrategy');
const Task = require('../../src/core/Task');
const Term = require('../../src/core/Term');

jest.useFakeTimers();

describe('TimeBasedForgettingStrategy', () => {
    it('should prune tasks that have expired', () => {
        const strategy = new TimeBasedForgettingStrategy({ expirationThreshold: 100n });
        const tasks = new Map();

        const term1 = new Term('a');
        const task1 = new Task(term1, '.'); // Expired
        tasks.set(task1.id, task1);

        jest.advanceTimersByTime(150);

        const term2 = new Term('b');
        const task2 = new Task(term2, '.'); // Not expired
        tasks.set(task2.id, task2);

        const prunedTasks = strategy.prune(tasks);

        expect(prunedTasks.size).toBe(1);
        expect(prunedTasks.has(task2.id)).toBe(true);
        expect(prunedTasks.has(task1.id)).toBe(false);
    });

    it('should not prune tasks that have not expired', () => {
        const strategy = new TimeBasedForgettingStrategy({ expirationThreshold: 200n });
        const tasks = new Map();

        const term1 = new Term('a');
        const task1 = new Task(term1, '.');
        tasks.set(task1.id, task1);

        jest.advanceTimersByTime(100);

        const term2 = new Term('b');
        const task2 = new Task(term2, '.');
        tasks.set(task2.id, task2);

        const prunedTasks = strategy.prune(tasks);

        expect(prunedTasks.size).toBe(2);
        expect(prunedTasks.has(task1.id)).toBe(true);
        expect(prunedTasks.has(task2.id)).toBe(true);
    });

    it('should use the default expiration threshold if none is provided', () => {
        const strategy = new TimeBasedForgettingStrategy();
        expect(strategy.expirationThreshold).toBe(24n * 3600000n);
    });
});
