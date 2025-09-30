import Memory from '../../core/memory/Memory.js';
import Task from '../../core/core/Task.js';
import Term from '../../core/core/Term.js';
import ConfigManager from '../../core/config/ConfigManager.js';

describe('Memory - Edge Cases', () => {
    let memory;

    beforeEach(() => {
        const configManager = new ConfigManager();
        const mockEventBus = {
            on: vi.fn(),
            emit: vi.fn(),
            emitAsync: vi.fn(),
        };
        const mockCommandBus = {
            handle: vi.fn(),
            request: vi.fn(),
        };
        memory = new Memory(configManager, mockEventBus, mockCommandBus);
    });

    test('should handle adding null and undefined terms', async () => {
        await expect(memory._addTerm(null)).rejects.toThrow('Can only add valid Term instances to memory');
        await expect(memory._addTerm(undefined)).rejects.toThrow('Can only add valid Term instances to memory');
    });

    test('should handle adding invalid term objects', async () => {
        await expect(memory._addTerm({})).rejects.toThrow('Can only add valid Term instances to memory');
        await expect(memory._addTerm('string')).rejects.toThrow('Can only add valid Term instances to memory');
        await expect(memory._addTerm(123)).rejects.toThrow('Can only add valid Term instances to memory');
    });

    test('should handle getting terms with invalid keys', () => {
        expect(memory._getTerm(null)).toBeNull();
        expect(memory._getTerm(undefined)).toBeNull();
        expect(memory._getTerm(123)).toBeNull();
        expect(memory._getTerm({})).toBeNull();
    });

    test('should handle adding null and undefined tasks', async () => {
        await expect(memory._addTasks(null)).resolves.not.toThrow();
        await expect(memory._addTasks(undefined)).resolves.not.toThrow();
        await expect(memory._addTasks([null, undefined, new Task(new Term('cat'), '.')])).resolves.not.toThrow();
        await expect(memory._getAllTasks()).resolves.toHaveLength(1);
    });

    test('should handle adding invalid task objects', async () => {
        await expect(memory._addTasks([{}, 'string', 123, new Task(new Term('cat'), '.')])).resolves.not.toThrow();
        await expect(memory._getAllTasks()).resolves.toHaveLength(1);
    });

    test('should handle empty task arrays', async () => {
        await expect(memory._addTasks([])).resolves.not.toThrow();
        await expect(memory._getAllTasks()).resolves.toHaveLength(0);
    });

    test('should handle getting non-existent tasks', async () => {
        await expect(memory._getTask('non-existent-id')).toBeUndefined();
    });

    test('should handle removing non-existent tasks', async () => {
        await expect(memory._removeTask('non-existent-id')).resolves.not.toThrow();
    });

    test('should handle cloning memory with large datasets', async () => {
        for (let i = 0; i < 100; i++) {
            const term = new Term(`term${i}`);
            await memory._addTerm(term);
            const task = new Task(term, '.', {
                frequency: 0.5,
                confidence: 0.8
            });
            await memory._addTasks(task);
        }

        const clonedMemory = await memory.clone();
        await expect(clonedMemory._getStatistics()).resolves.toHaveProperty('terms', 100);
        await expect(clonedMemory._getStatistics()).resolves.toHaveProperty('shortTermTasks', 100);
    });

    test('should handle clearing empty memory', async () => {
        await expect(memory._clear()).resolves.not.toThrow();
        const stats = await memory._getStatistics();
        expect(stats.terms).toBe(0);
        expect(stats.shortTermTasks).toBe(0);
    });

    test('should handle clearing memory with terms and tasks', async () => {
        const term = new Term('cat');
        await memory._addTerm(term);
        const task = new Task(term, '.');
        await memory._addTasks(task);

        let stats = await memory._getStatistics();
        expect(stats.terms).toBe(1);
        expect(stats.shortTermTasks).toBe(1);

        await memory._clear();
        stats = await memory._getStatistics();
        expect(stats.terms).toBe(0);
        expect(stats.shortTermTasks).toBe(0);
    });

    test('should handle queryTasks with invalid filters', async () => {
        const term = new Term('cat');
        await memory._addTerm(term);
        const task = new Task(term, '.');
        await memory._addTasks(task);

        const results1 = await memory._queryTasks({
            punctuation: 'invalid'
        });
        expect(results1).toHaveLength(0);

        const results2 = await memory._queryTasks({
            minPriority: -1
        });
        expect(results2.length).toBeGreaterThan(0);

        const results3 = await memory._queryTasks({
            minConfidence: 2
        });
        expect(results3).toHaveLength(0);
    });

    test('should handle getHighestPriorityTasks with edge cases', async () => {
        const results1 = await memory._getHighestPriorityTasks(0);
        expect(results1).toHaveLength(0);

        const results2 = await memory._getHighestPriorityTasks(-5);
        expect(results2).toHaveLength(0);

        const results3 = await memory._getHighestPriorityTasks(1000);
        expect(results3).toHaveLength(0);

        const term = new Term('cat');
        await memory._addTerm(term);
        for (let i = 0; i < 5; i++) {
            const task = new Task(term, '.');
            task.state.priority = i * 0.1;
            await memory._addTasks(task);
        }

        const results4 = await memory._getHighestPriorityTasks(3);
        expect(results4).toHaveLength(3);
        expect(results4[0].state.priority).toBeGreaterThanOrEqual(results4[1].state.priority);
        expect(results4[1].state.priority).toBeGreaterThanOrEqual(results4[2].state.priority);
    });

    test('should handle getRecentTasks with edge cases', async () => {
        const results1 = await memory._getRecentTasks();
        expect(results1).toHaveLength(0);

        const results2 = await memory._getRecentTasks(0);
        expect(results2).toHaveLength(0);

        const results3 = await memory._getRecentTasks(-5);
        expect(results3).toHaveLength(0);
    });

    test('should handle exportState and importState with edge cases', async () => {
        const emptyState = await memory._exportState();
        expect(emptyState).toContain('"terms": []');
        expect(emptyState).toContain('"shortTermTasks": []');

        await expect(memory._importState('invalid json')).rejects.toThrow();
        await expect(memory._importState('{}')).resolves.not.toThrow();
        await expect(memory._importState('{"terms":[],"shortTermTasks":[],"longTermTasks":[]}')).resolves.not.toThrow();
    });

    test('should handle getBeliefs, getGoals, and getQuestions with empty results', async () => {
        await expect(memory._getBeliefs()).resolves.toHaveLength(0);
        await expect(memory._getGoals()).resolves.toHaveLength(0);
        await expect(memory._getQuestions()).resolves.toHaveLength(0);
    });

    test('should handle getStatistics correctly', async () => {
        const stats = await memory._getStatistics();
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