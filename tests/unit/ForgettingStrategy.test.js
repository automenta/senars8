const TimeBasedForgettingStrategy = require('../../src/memory/strategies/TimeBasedForgettingStrategy');
const Task = require('../../src/core/Task');
const {parseTerm} = require('../../src/parser/narseseParser');

describe('TimeBasedForgettingStrategy', () => {
    let strategy;
    let task1, task2, task3;

    beforeEach(() => {
        strategy = new TimeBasedForgettingStrategy();
        const now = BigInt(Date.now());
        const oneDayInMs = BigInt(24 * 3600 * 1000);

        const term1 = parseTerm('(term1 --> property)');
        task1 = new Task(term1, '.');
        task1.state.stamp.lastAccessed = now - (oneDayInMs * BigInt(2)); // 2 days ago
        task1.state.priority = 0.1; // Unimportant
        task1.state.truthValue.confidence = 0.1; // Unimportant

        const term2 = parseTerm('(term2 --> property)');
        task2 = new Task(term2, '.');
        task2.state.stamp.lastAccessed = now; // Accessed now

        const term3 = parseTerm('(term3 --> property)');
        task3 = new Task(term3, '.');
        task3.state.stamp.lastAccessed = now - (oneDayInMs * BigInt(2)); // 2 days ago
        task3.state.priority = 0.9; // Important
    });

    it('should prune tasks that have expired and are not important', () => {
        const tasks = new Map([[task1.id, task1], [task2.id, task2]]);
        const options = {
            expirationThreshold: BigInt(24 * 3600 * 1000),
            importanceThresholds: {priority: 0.5, confidence: 0.5}
        };
        const prunedTasks = strategy.prune(tasks, options);

        expect(prunedTasks.size).toBe(1);
        expect(prunedTasks.has(task2.id)).toBe(true);
        expect(prunedTasks.has(task1.id)).toBe(false);
    });

    it('should NOT prune tasks that have expired but ARE important', () => {
        const tasks = new Map([[task3.id, task3], [task2.id, task2]]);
        const options = {
            expirationThreshold: BigInt(24 * 3600 * 1000),
            importanceThresholds: {priority: 0.5, confidence: 0.5}
        };
        const prunedTasks = strategy.prune(tasks, options);

        expect(prunedTasks.size).toBe(2);
        expect(prunedTasks.has(task2.id)).toBe(true);
        expect(prunedTasks.has(task3.id)).toBe(true);
    });

    it('should use default options if none are provided', () => {
        // This test is tricky because the default expiration is long.
        // We can check if an expired, unimportant task is pruned by the default options.
        const tasks = new Map([[task1.id, task1]]);
        const prunedTasks = strategy.prune(tasks); // No options provided
        expect(prunedTasks.size).toBe(0); // Should be pruned by default options
    });
});
