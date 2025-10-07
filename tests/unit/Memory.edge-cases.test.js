import {vi} from 'vitest';
import Memory from '../../core/memory/Memory.js';
import Task from '../../core/core/Task.js';
import Term from '../../core/core/Term.js';
import ConfigManager from '../../core/config/ConfigManager.js';
import * as logger from '../../core/utils/logger.js';

describe('Memory - Edge Cases', () => {
    let memory;
    let errorSpy;
    let warnSpy;

    beforeEach(() => {
        errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {
        });
        warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {
        });

        const configManager = new ConfigManager();
        // Create minimal objects that satisfy the interfaces without heavy mocking
        const minimalEventBus = {
            on: () => {}, // no-op function
            emit: () => Promise.resolve(), // return resolved promise
            emitAsync: () => Promise.resolve(),
        };
        const minimalCommandBus = {
            handle: () => {}, // no-op function
            request: () => Promise.resolve(null), // return resolved promise with null
        };
        memory = new Memory(configManager, minimalEventBus, minimalCommandBus);
    });

    afterEach(() => {
        errorSpy.mockRestore();
        warnSpy.mockRestore();
    });

    test('should handle adding null and undefined terms', async () => {
        await expect(memory.addTerm(null)).rejects.toThrow('Can only add valid Term instances to memory');
        await expect(memory.addTerm(undefined)).rejects.toThrow('Can only add valid Term instances to memory');
    });

    test('should handle adding invalid term objects', async () => {
        await expect(memory.addTerm({})).rejects.toThrow('Can only add valid Term instances to memory');
        await expect(memory.addTerm('string')).rejects.toThrow('Can only add valid Term instances to memory');
        await expect(memory.addTerm(123)).rejects.toThrow('Can only add valid Term instances to memory');
    });

    test('should handle getting terms with invalid keys', () => {
        expect(memory.getTerm(null)).toBeNull();
        expect(memory.getTerm(undefined)).toBeNull();
        expect(memory.getTerm(123)).toBeNull();
        expect(memory.getTerm({})).toBeNull();
    });

    test('should handle adding null and undefined tasks', async () => {
        await expect(memory.addTasks(null)).resolves.not.toThrow();
        await expect(memory.addTasks(undefined)).resolves.not.toThrow();
        await expect(memory.addTasks([null, undefined, new Task(new Term('cat'), '.')])).resolves.not.toThrow();
        await expect(memory.getAllTasks()).resolves.toHaveLength(1);
    });

    test('should handle adding invalid task objects', async () => {
        await expect(memory.addTasks([{}, 'string', 123, new Task(new Term('cat'), '.')])).resolves.not.toThrow();
        await expect(memory.getAllTasks()).resolves.toHaveLength(1);
    });

    test('should handle empty task arrays', async () => {
        await expect(memory.addTasks([])).resolves.not.toThrow();
        await expect(memory.getAllTasks()).resolves.toHaveLength(0);
    });

    test('should handle getting non-existent tasks', async () => {
        await expect(memory.getTask('non-existent-id')).toBeUndefined();
    });

    test('should handle removing non-existent tasks', async () => {
        await expect(memory.removeTask('non-existent-id')).resolves.not.toThrow();
    });

    test('should handle cloning memory with large datasets', async () => {
        for (let i = 0; i < 100; i++) {
            const term = new Term(`term${i}`);
            await memory.addTerm(term);
            const task = new Task(term, '.', {
                frequency: 0.5,
                confidence: 0.8
            });
            await memory.addTasks(task);
        }

        const clonedMemory = await memory.clone();
        await expect(clonedMemory.getStatistics()).resolves.toHaveProperty('terms', 100);
        await expect(clonedMemory.getStatistics()).resolves.toHaveProperty('shortTermTasks', 100);
    });

    test('should handle clearing empty memory', async () => {
        await expect(memory.clear()).resolves.not.toThrow();
        const stats = await memory.getStatistics();
        expect(stats.terms).toBe(0);
        expect(stats.shortTermTasks).toBe(0);
    });

    test('should handle clearing memory with terms and tasks', async () => {
        const term = new Term('cat');
        await memory.addTerm(term);
        const task = new Task(term, '.');
        await memory.addTasks(task);

        let stats = await memory.getStatistics();
        expect(stats.terms).toBe(1);
        expect(stats.shortTermTasks).toBe(1);

        await memory.clear();
        stats = await memory.getStatistics();
        expect(stats.terms).toBe(0);
        expect(stats.shortTermTasks).toBe(0);
    });

    test('should handle queryTasks with invalid filters', async () => {
        const term = new Term('cat');
        await memory.addTerm(term);
        const task = new Task(term, '.');
        await memory.addTasks(task);

        const results1 = await memory.queryTasks({
            punctuation: 'invalid'
        });
        expect(results1).toHaveLength(0);

        const results2 = await memory.queryTasks({
            minPriority: -1
        });
        expect(results2.length).toBeGreaterThan(0);

        const results3 = await memory.queryTasks({
            minConfidence: 2
        });
        expect(results3).toHaveLength(0);
    });

    test('should handle getHighestPriorityTasks with edge cases', async () => {
        const results1 = await memory.getHighestPriorityTasks(0);
        expect(results1).toHaveLength(0);

        const results2 = await memory.getHighestPriorityTasks(-5);
        expect(results2).toHaveLength(0);

        const results3 = await memory.getHighestPriorityTasks(1000);
        expect(results3).toHaveLength(0);

        const term = new Term('cat');
        await memory.addTerm(term);
        for (let i = 0; i < 5; i++) {
            const task = new Task(term, '.');
            task.state.priority = i * 0.1;
            await memory.addTasks(task);
        }

        const results4 = await memory.getHighestPriorityTasks(3);
        expect(results4).toHaveLength(3);
        expect(results4[0].state.priority).toBeGreaterThanOrEqual(results4[1].state.priority);
        expect(results4[1].state.priority).toBeGreaterThanOrEqual(results4[2].state.priority);
    });

    test('should handle getRecentTasks with edge cases', async () => {
        const results1 = await memory.getRecentTasks();
        expect(results1).toHaveLength(0);

        const results2 = await memory.getRecentTasks(0);
        expect(results2).toHaveLength(0);

        const results3 = await memory.getRecentTasks(-5);
        expect(results3).toHaveLength(0);
    });

    test('should handle exportState and importState with edge cases', async () => {
        const emptyState = await memory.exportState();
        expect(emptyState).toContain('"terms": []');
        expect(emptyState).toContain('"shortTermTasks": []');

        await expect(memory.importState('invalid json')).rejects.toThrow();
        await expect(memory.importState('{}')).resolves.not.toThrow();
        await expect(memory.importState('{"terms":[],"shortTermTasks":[],"longTermTasks":[]}')).resolves.not.toThrow();
    });

    test('should handle getBeliefs, getGoals, and getQuestions with empty results', async () => {
        await expect(memory.getBeliefs()).resolves.toHaveLength(0);
        await expect(memory.getGoals()).resolves.toHaveLength(0);
        await expect(memory.getQuestions()).resolves.toHaveLength(0);
    });

    test('should handle getStatistics correctly', async () => {
        const stats = await memory.getStatistics();
        expect(stats).toHaveProperty('terms');
        expect(stats).toHaveProperty('shortTermTasks');
        expect(stats).toHaveProperty('longTermTasks');
        expect(stats).toHaveProperty('implications');
        expect(stats).toHaveProperty('beliefs');
        expect(stats).toHaveProperty('costs');

        Object.values(stats).forEach(value => {
            expect(typeof value).toBe('number');
        });
    });
});