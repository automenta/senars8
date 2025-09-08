const Memory = require('../../src/memory/Memory');
const Task = require('../../src/core/Task');
const {parseTerm} = require('../../src/parser/narseseParser');
const config = require('../../src/config');

describe('Memory', () => {
    let memory;
    let originalMemoryConfig;

    beforeEach(() => {
        // Manually backup and modify config for tests
        originalMemoryConfig = {...config.memory};
        config.memory = {
            ...config.memory,
            FORGETTING_STRATEGY_OPTIONS: {
                shortTerm: {
                    expirationThreshold: BigInt(24 * 3600 * 1000), // 1 day
                    importanceThresholds: {priority: 0.5, confidence: 0.5}
                },
                longTerm: {
                    expirationThreshold: BigInt(30 * 24 * 3600 * 1000), // 30 days
                    importanceThresholds: {priority: 0.8, confidence: 0.8}
                }
            }
        };
        memory = new Memory();
    });

    afterEach(() => {
        // Restore original config
        config.memory = originalMemoryConfig;
    });

    it('should prune expired, unimportant tasks during maintenance', async () => {
        const now = BigInt(Date.now());
        const longAgo = now - (BigInt(24 * 3600 * 1000) * BigInt(2)); // 2 days ago

        const term1 = parseTerm('(unimportant_and_old --> property)');
        const task1 = new Task(term1, '.');
        task1.state.stamp.lastAccessed = longAgo;
        task1.state.priority = 0.1; // Unimportant
        task1.state.truthValue.confidence = 0.1; // Unimportant

        const term2 = parseTerm('(new_and_unimportant --> property)');
        const task2 = new Task(term2, '.');

        await memory.addTasks([task1, task2]);
        expect(memory.shortTermTasks.size).toBe(2);

        memory._pruneMemory();

        expect(memory.shortTermTasks.size).toBe(1);
        expect(memory.shortTermTasks.has(task2.id)).toBe(true);
    });

    it('should NOT prune expired but important tasks', async () => {
        const now = BigInt(Date.now());
        const longAgo = now - (BigInt(24 * 3600 * 1000) * BigInt(2)); // 2 days ago

        const term1 = parseTerm('(important_and_old --> property)');
        const task1 = new Task(term1, '.');
        task1.state.stamp.lastAccessed = longAgo;
        task1.state.priority = 0.9; // Important!

        await memory.addTasks([task1]);
        expect(memory.shortTermTasks.size).toBe(1);

        memory._pruneMemory();

        expect(memory.shortTermTasks.size).toBe(1);
        expect(memory.shortTermTasks.has(task1.id)).toBe(true);
    });
});
