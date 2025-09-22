import Memory from '../../core/memory/Memory.js';
import Task from '../../core/core/Task.js';
import Term from '../../core/core/Term.js';
import ConfigManager from '../../core/config/ConfigManager.js';

describe('Memory - Edge Cases', () => {
    let memory;

    beforeEach(() => {
        const configManager = new ConfigManager();
        const mockEventBus = {
            on: jest.fn(),
            emit: jest.fn(),
        };
        memory = new Memory(configManager, mockEventBus);
    });

    test('should handle adding null and undefined terms', () => {
        expect(() => memory.addTerm(null)).toThrow('Can only add valid Term instances to memory');
        expect(() => memory.addTerm(undefined)).toThrow('Can only add valid Term instances to memory');
    });

    test('should handle adding invalid term objects', () => {
        expect(() => memory.addTerm({})).toThrow('Can only add valid Term instances to memory');
        expect(() => memory.addTerm('string')).toThrow('Can only add valid Term instances to memory');
        expect(() => memory.addTerm(123)).toThrow('Can only add valid Term instances to memory');
    });

    test('should handle getting terms with invalid keys', () => {
        expect(memory.getTerm(null)).toBeNull();
        expect(memory.getTerm(undefined)).toBeNull();
        expect(memory.getTerm(123)).toBeNull();
        expect(memory.getTerm({})).toBeNull();
    });

    test('should handle adding null and undefined tasks', () => {
        expect(() => memory.addTasks(null)).not.toThrow();
        expect(() => memory.addTasks(undefined)).not.toThrow();
        expect(() => memory.addTasks([null, undefined, new Task(new Term('cat'), '.')])).not.toThrow();
        expect(memory.getAllTasks()).toHaveLength(1);
    });

    test('should handle adding invalid task objects', () => {
        expect(() => memory.addTasks([{}, 'string', 123, new Task(new Term('cat'), '.')])).not.toThrow();
        expect(memory.getAllTasks()).toHaveLength(1);
    });

    test('should handle empty task arrays', () => {
        expect(() => memory.addTasks([])).not.toThrow();
        expect(memory.getAllTasks()).toHaveLength(0);
    });

    test('should handle getting non-existent tasks', () => {
        expect(memory.getTask('non-existent-id')).toBeUndefined();
    });

    test('should handle removing non-existent tasks', () => {
        expect(() => memory.removeTask('non-existent-id')).not.toThrow();
    });

    test('should handle cloning memory with large datasets', () => {
        for (let i = 0; i < 100; i++) {
            const term = new Term(`term${i}`);
            memory.addTerm(term);
            const task = new Task(term, '.', {
                frequency: 0.5,
                confidence: 0.8
            });
            memory.addTasks(task);
        }

        const clonedMemory = memory.clone();
        expect(clonedMemory.getStatistics().terms).toBe(100);
        expect(clonedMemory.getStatistics().shortTermTasks).toBe(100);
    });

    test('should handle clearing empty memory', () => {
        expect(() => memory.clear()).not.toThrow();
        expect(memory.getStatistics().terms).toBe(0);
        expect(memory.getStatistics().shortTermTasks).toBe(0);
    });

    test('should handle clearing memory with terms and tasks', () => {
        const term = new Term('cat');
        memory.addTerm(term);
        const task = new Task(term, '.');
        memory.addTasks(task);

        expect(memory.getStatistics().terms).toBe(1);
        expect(memory.getStatistics().shortTermTasks).toBe(1);

        memory.clear();
        expect(memory.getStatistics().terms).toBe(0);
        expect(memory.getStatistics().shortTermTasks).toBe(0);
    });

    test('should handle queryTasks with invalid filters', () => {
        const term = new Term('cat');
        memory.addTerm(term);
        const task = new Task(term, '.');
        memory.addTasks(task);

        const results1 = memory.queryTasks({
            punctuation: 'invalid'
        });
        expect(results1).toHaveLength(0);

        const results2 = memory.queryTasks({
            minPriority: -1
        });
        expect(results2.length).toBeGreaterThan(0);

        const results3 = memory.queryTasks({
            minConfidence: 2
        });
        expect(results3).toHaveLength(0);
    });

    test('should handle getHighestPriorityTasks with edge cases', () => {
        const results1 = memory.getHighestPriorityTasks(0);
        expect(results1).toHaveLength(0);

        const results2 = memory.getHighestPriorityTasks(-5);
        expect(results2).toHaveLength(0);

        const results3 = memory.getHighestPriorityTasks(1000);
        expect(results3).toHaveLength(0);

        const term = new Term('cat');
        memory.addTerm(term);
        for (let i = 0; i < 5; i++) {
            const task = new Task(term, '.');
            task.state.priority = i * 0.1;
            memory.addTasks(task);
        }

        const results4 = memory.getHighestPriorityTasks(3);
        expect(results4).toHaveLength(3);
        expect(results4[0].state.priority).toBeGreaterThanOrEqual(results4[1].state.priority);
        expect(results4[1].state.priority).toBeGreaterThanOrEqual(results4[2].state.priority);
    });

    test('should handle getRecentTasks with edge cases', () => {
        const results1 = memory.getRecentTasks();
        expect(results1).toHaveLength(0);

        const results2 = memory.getRecentTasks(0);
        expect(results2).toHaveLength(0);

        const results3 = memory.getRecentTasks(-5);
        expect(results3).toHaveLength(0);
    });

    test('should handle exportState and importState with edge cases', () => {
        const emptyState = memory.exportState();
        expect(emptyState).toContain('"terms": []');
        expect(emptyState).toContain('"shortTermTasks": []');

        expect(() => memory.importState('invalid json')).toThrow();
        expect(() => memory.importState('{}')).not.toThrow();
        expect(() => memory.importState('{"terms":[],"shortTermTasks":[],"longTermTasks":[]}')).not.toThrow();
    });

    test('should handle getBeliefs, getGoals, and getQuestions with empty results', () => {
        expect(memory.getBeliefs()).toHaveLength(0);
        expect(memory.getGoals()).toHaveLength(0);
        expect(memory.getQuestions()).toHaveLength(0);
    });

    test('should handle getStatistics correctly', () => {
        const stats = memory.getStatistics();
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