import TimeBasedForgettingStrategy from '../../src/memory/strategies/TimeBasedForgettingStrategy.js';
import Task from '../../src/core/Task.js';
import {
    parseTerm
} from '../../src/parser/narseseParser.js';

const createTask = (term, {
    lastAccessed,
    priority,
    confidence
}) => {
    const task = new Task(parseTerm(term), '.');
    if (lastAccessed) task.state.stamp.lastAccessed = lastAccessed;
    if (priority) task.state.priority = priority;
    if (confidence) task.state.truthValue.confidence = confidence;
    return task;
};

describe('TimeBasedForgettingStrategy', () => {
    let strategy;
    let unimportantOldTask, newTask, importantOldTask;
    const oneDayInMs = BigInt(24 * 3600 * 1000);
    const now = BigInt(Date.now());

    beforeEach(() => {
        strategy = new TimeBasedForgettingStrategy();

        unimportantOldTask = createTask('(unimportant_and_old --> property)', {
            lastAccessed: now - (oneDayInMs * BigInt(2)),
            priority: 0.1,
            confidence: 0.1
        });

        newTask = createTask('(new_and_unimportant --> property)', {
            lastAccessed: now
        });

        importantOldTask = createTask('(important_and_old --> property)', {
            lastAccessed: now - (oneDayInMs * BigInt(2)),
            priority: 0.9
        });
    });

    it('should prune tasks that have expired and are not important', () => {
        const tasks = new Map([
            [unimportantOldTask.id, unimportantOldTask],
            [newTask.id, newTask]
        ]);
        const options = {
            expirationThreshold: oneDayInMs,
            importanceThresholds: {
                priority: 0.5,
                confidence: 0.5
            }
        };
        const prunedTasks = strategy.prune(tasks, options);

        expect(prunedTasks.size).toBe(1);
        expect(prunedTasks.has(newTask.id)).toBe(true);
        expect(prunedTasks.has(unimportantOldTask.id)).toBe(false);
    });

    it('should NOT prune tasks that have expired but ARE important', () => {
        const tasks = new Map([
            [importantOldTask.id, importantOldTask],
            [newTask.id, newTask]
        ]);
        const options = {
            expirationThreshold: oneDayInMs,
            importanceThresholds: {
                priority: 0.5,
                confidence: 0.5
            }
        };
        const prunedTasks = strategy.prune(tasks, options);

        expect(prunedTasks.size).toBe(2);
        expect(prunedTasks.has(newTask.id)).toBe(true);
        expect(prunedTasks.has(importantOldTask.id)).toBe(true);
    });

    it('should use default options if none are provided', () => {
        const tasks = new Map([
            [unimportantOldTask.id, unimportantOldTask]
        ]);
        const prunedTasks = strategy.prune(tasks);
        expect(prunedTasks.size).toBe(0);
    });
});
