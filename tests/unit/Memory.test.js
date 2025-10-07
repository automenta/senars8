import {vi} from 'vitest';
import Memory from '../../core/memory/Memory.js';
import Task from '../../core/core/Task.js';
import Term from '../../core/core/Term.js';
import {parseTerm} from '../../core/parser/narseseParser.js';
import ConfigManager from '../../core/config/ConfigManager.js';
import configService from '../../core/config/ConfigService.js';
import {SYSTEM_CONSTANTS} from '../../core/config/constants.js';
import * as logger from '../../core/utils/logger.js';

const createTestConfig = () => new ConfigManager({
    memory: {
        FORGETTING_STRATEGY_OPTIONS: {
            shortTerm: {expirationThreshold: 24 * 3600 * 1000, importanceThresholds: {priority: 0.5, confidence: 0.5}},
            longTerm: {expirationThreshold: 30 * 24 * 3600 * 1000, importanceThresholds: {priority: 0.8, confidence: 0.8}},
        },
        MAINTENANCE_CYCLE_FREQUENCY: 1,
        CONSOLIDATION_PRIORITY_THRESHOLD: 0.95,
        CONSOLIDATION_CONFIDENCE_THRESHOLD: 0.95,
    },
});

const createTask = (term, {lastAccessed, priority, confidence}) => {
    const task = new Task(parseTerm(term), '.');
    if (priority) task.state.priority = priority;
    if (confidence) task.state.truthValue.confidence = confidence;
    if (lastAccessed) task.state.stamp.lastAccessed = lastAccessed;
    return task;
};

describe('Memory', () => {
    let memory;
    let errorSpy;
    let warnSpy;
    let minimalEventBus;

    beforeEach(() => {
        errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
        warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
        configService.reset();

        const configManager = createTestConfig();
        configService.initialize(configManager.getAll());

        const eventHandlers = new Map();
        minimalEventBus = {
            on: (event, handler) => {
                const handlers = eventHandlers.get(event) || [];
                handlers.push(handler);
                eventHandlers.set(event, handlers);
            },
            emit: () => Promise.resolve(),
            emitAsync: () => Promise.resolve(),
            getHandlers: (event) => eventHandlers.get(event) || [],
            trigger: (event, ...args) => {
                const handlers = eventHandlers.get(event) || [];
                return Promise.all(handlers.map(handler => handler(...args)));
            }
        };
        const minimalCommandBus = {handle: () => {}, request: () => Promise.resolve(null)};
        memory = new Memory(configManager, minimalEventBus, minimalCommandBus);
    });

    afterEach(() => {
        errorSpy.mockRestore();
        warnSpy.mockRestore();
    });

    describe('Maintenance Cycles', () => {
        it('should prune expired, unimportant tasks during maintenance', async () => {
            const {SystemEvents} = await import('../../core/system/SystemEvents.js');
            const now = Date.now();
            const longAgo = now - (24 * 3600 * 1000 * 2);
            const task1 = createTask('(unimportant_and_old --> property)', {lastAccessed: longAgo, priority: SYSTEM_CONSTANTS.DEFAULT_PRIORITIES.LOW, confidence: SYSTEM_CONSTANTS.DEFAULT_TRUTH_VALUES.VERY_LOW.confidence});
            const task2 = createTask('(new_and_unimportant --> property)', {confidence: SYSTEM_CONSTANTS.DEFAULT_TRUTH_VALUES.MEDIUM.confidence});
            await memory.addTasks([task1, task2]);
            expect(memory.shortTermTasks.size).toBe(2);
            await minimalEventBus.trigger(SystemEvents.CYCLE_COMPLETE);
            expect(memory.shortTermTasks.size).toBe(1);
            expect(memory.shortTermTasks.has(task2.id)).toBe(true);
        });

        it('should NOT prune expired but important tasks', async () => {
            const {SystemEvents} = await import('../../core/system/SystemEvents.js');
            const now = Date.now();
            const longAgo = now - (24 * 3600 * 1000 * 2);
            const task1 = createTask('(important_and_old --> property)', {lastAccessed: longAgo, priority: SYSTEM_CONSTANTS.DEFAULT_PRIORITIES.HIGH});
            await memory.addTasks([task1]);
            expect(memory.shortTermTasks.size).toBe(1);
            await minimalEventBus.trigger(SystemEvents.CYCLE_COMPLETE);
            expect(memory.shortTermTasks.size).toBe(1);
            expect(memory.shortTermTasks.has(task1.id)).toBe(true);
        });
    });

    describe('Term Handling', () => {
        test.each([null, undefined, {}, 'string', 123])('should reject adding invalid term: %p', async (term) => {
            await expect(memory.addTerm(term)).rejects.toThrow('Can only add valid Term instances to memory');
        });

        test.each([null, undefined, 123, {}])('should return null for invalid term keys: %p', (key) => {
            expect(memory.getTerm(key)).toBeNull();
        });
    });

    describe('Task Handling', () => {
        it('should handle adding mixed validity tasks', async () => {
            await expect(memory.addTasks([null, undefined, new Task(new Term('cat'), '.')])).resolves.not.toThrow();
            await expect(memory.getAllTasks()).resolves.toHaveLength(1);
        });

        it('should handle adding invalid task objects', async () => {
            await expect(memory.addTasks([{}, 'string', 123, new Task(new Term('cat'), '.')])).resolves.not.toThrow();
            await expect(memory.getAllTasks()).resolves.toHaveLength(1);
        });

        it('should handle empty task arrays', async () => {
            await expect(memory.addTasks([])).resolves.not.toThrow();
            await expect(memory.getAllTasks()).resolves.toHaveLength(0);
        });

        test.each([
            ['non-existent-id', undefined],
            [null, undefined],
            [undefined, undefined],
        ])('should handle getting task with invalid ID: %s', (id, expected) => {
            expect(memory.getTask(id)).toBe(expected);
        });

        it('should handle removing non-existent tasks', async () => {
            await expect(memory.removeTask('non-existent-id')).resolves.not.toThrow();
        });
    });

    describe('State Management', () => {
        it('should handle cloning memory with large datasets', async () => {
            for (let i = 0; i < 100; i++) {
                const term = new Term(`term${i}`);
                await memory.addTerm(term);
                await memory.addTasks(new Task(term, '.', {frequency: 0.5, confidence: 0.8}));
            }
            const clonedMemory = await memory.clone();
            await expect(clonedMemory.getStatistics()).resolves.toHaveProperty('terms', 100);
            await expect(clonedMemory.getStatistics()).resolves.toHaveProperty('shortTermTasks', 100);
        });

        it('should handle clearing empty and populated memory', async () => {
            await expect(memory.clear()).resolves.not.toThrow();
            let stats = await memory.getStatistics();
            expect(stats.terms).toBe(0);
            expect(stats.shortTermTasks).toBe(0);

            const term = new Term('cat');
            await memory.addTerm(term);
            await memory.addTasks(new Task(term, '.'));

            stats = await memory.getStatistics();
            expect(stats.terms).toBe(1);
            expect(stats.shortTermTasks).toBe(1);

            await memory.clear();
            stats = await memory.getStatistics();
            expect(stats.terms).toBe(0);
            expect(stats.shortTermTasks).toBe(0);
        });

        it('should handle export and import with edge cases', async () => {
            const emptyState = await memory.exportState();
            expect(emptyState).toContain('"terms": []');
            expect(emptyState).toContain('"shortTermTasks": []');
            await expect(memory.importState('invalid json')).rejects.toThrow();
            await expect(memory.importState('{}')).resolves.not.toThrow();
            await expect(memory.importState('{"terms":[],"shortTermTasks":[],"longTermTasks":[]}')).resolves.not.toThrow();
        });
    });

    describe('Querying', () => {
        test.each([
            [{punctuation: 'invalid'}, 0],
            [{minPriority: -1}, 1],
            [{minConfidence: 2}, 0],
        ])('should handle queryTasks with invalid filters: %p', async (filter, expectedLength) => {
            await memory.addTasks(new Task(new Term('cat'), '.'));
            const results = await memory.queryTasks(filter);
            expect(results).toHaveLength(expectedLength);
        });

        test.each([0, -5, 1000])('should handle getHighestPriorityTasks with edge cases: %i', async (count) => {
            const results = await memory.getHighestPriorityTasks(count);
            expect(results).toHaveLength(0);
        });

        it('should return sorted tasks for getHighestPriorityTasks', async () => {
            const term = new Term('cat');
            await memory.addTerm(term);
            for (let i = 0; i < 5; i++) {
                const task = new Task(term, '.');
                task.state.priority = i * 0.1;
                await memory.addTasks(task);
            }
            const results = await memory.getHighestPriorityTasks(3);
            expect(results).toHaveLength(3);
            expect(results[0].state.priority).toBeGreaterThanOrEqual(results[1].state.priority);
            expect(results[1].state.priority).toBeGreaterThanOrEqual(results[2].state.priority);
        });

        test.each([undefined, 0, -5])('should handle getRecentTasks with edge cases', async (count) => {
            const results = await memory.getRecentTasks(count);
            expect(results).toHaveLength(0);
        });

        it('should handle getBeliefs, getGoals, and getQuestions with empty results', async () => {
            await expect(memory.getBeliefs()).resolves.toHaveLength(0);
            await expect(memory.getGoals()).resolves.toHaveLength(0);
            await expect(memory.getQuestions()).resolves.toHaveLength(0);
        });
    });

    it('should get statistics correctly', async () => {
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