import Memory from '../../src/memory/Memory.js';
import Task from '../../src/core/Task.js';
import {parseTerm} from '../../src/parser/narseseParser.js';
import ConfigManager from '../../src/config/ConfigManager.js';
import EventBus from '../../src/system/EventBus.js';

const createTestConfig = () => new ConfigManager({
    memory: {
        FORGETTING_STRATEGY_OPTIONS: {
            shortTerm: {
                expirationThreshold: BigInt(24 * 3600 * 1000), // 1 day
                importanceThresholds: {
                    priority: 0.5,
                    confidence: 0.5
                }
            },
            longTerm: {
                expirationThreshold: BigInt(30 * 24 * 3600 * 1000), // 30 days
                importanceThresholds: {
                    priority: 0.8,
                    confidence: 0.8
                }
            }
        },
        MAINTENANCE_CYCLE_FREQUENCY: 1,
    }
});

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

describe('Memory', () => {
    let memory;

    beforeEach(() => {
        const configManager = createTestConfig();
        memory = new Memory(configManager);
    });

    afterEach(() => {
        EventBus.clear();
    });

    it('should prune expired, unimportant tasks during maintenance', async () => {
        const now = BigInt(Date.now());
        const longAgo = now - (BigInt(24 * 3600 * 1000) * BigInt(2)); // 2 days ago

        const task1 = createTask('(unimportant_and_old --> property)', {
            lastAccessed: longAgo,
            priority: 0.1,
            confidence: 0.1
        });
        const task2 = createTask('(new_and_unimportant --> property)', {});

        await memory.addTasks([task1, task2]);
        expect(memory.shortTermTasks.size).toBe(2);

        EventBus.emit('SystemCycleEnded');

        expect(memory.shortTermTasks.size).toBe(1);
        expect(memory.shortTermTasks.has(task2.id)).toBe(true);
    });

    it('should NOT prune expired but important tasks', async () => {
        const now = BigInt(Date.now());
        const longAgo = now - (BigInt(24 * 3600 * 1000) * BigInt(2)); // 2 days ago

        const task1 = createTask('(important_and_old --> property)', {
            lastAccessed: longAgo,
            priority: 0.9
        });

        await memory.addTasks([task1]);
        expect(memory.shortTermTasks.size).toBe(1);

        EventBus.emit('SystemCycleEnded');

        expect(memory.shortTermTasks.size).toBe(1);
        expect(memory.shortTermTasks.has(task1.id)).toBe(true);
    });
});
