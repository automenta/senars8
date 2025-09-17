import Memory from '../../src/memory/Memory.js';
import Task from '../../src/core/Task.js';
import {parseTerm} from '../../src/parser/narseseParser.js';
import ConfigManager from '../../src/config/ConfigManager.js';
import EventBus from '../../src/system/EventBus.js';

const createTestConfig = () => new ConfigManager({
    memory: {
        FORGETTING_STRATEGY_OPTIONS: {
            shortTerm: {
                expirationThreshold: 24 * 3600 * 1000,
                importanceThresholds: {
                    priority: 0.5,
                    confidence: 0.5
                },
            },
            longTerm: {
                expirationThreshold: 30 * 24 * 3600 * 1000,
                importanceThresholds: {
                    priority: 0.8,
                    confidence: 0.8
                },
            },
        },
        MAINTENANCE_CYCLE_FREQUENCY: 1,
        CONSOLIDATION_PRIORITY_THRESHOLD: 0.95,
        CONSOLIDATION_CONFIDENCE_THRESHOLD: 0.95,
    },
});

const createTask = (term, {
    lastAccessed,
    priority,
    confidence
}) => {
    const task = new Task(parseTerm(term), '.');
    if (priority) task.state.priority = priority;
    if (confidence) task.state.truthValue.confidence = confidence;
    if (lastAccessed) task.state.stamp.lastAccessed = lastAccessed;
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
        const now = Date.now();
        const longAgo = now - (24 * 3600 * 1000 * 2);
        const task1 = createTask('(unimportant_and_old --> property)', {
            lastAccessed: longAgo,
            priority: 0.1,
            confidence: 0.1,
        });
        const task2 = createTask('(new_and_unimportant --> property)', {
            confidence: 0.8
        });
        await memory.addTasks([task1, task2]);
        expect(memory.shortTermTasks.size).toBe(2);
        EventBus.emit('SystemCycleEnded');
        expect(memory.shortTermTasks.size).toBe(1);
        expect(memory.shortTermTasks.has(task2.id)).toBe(true);
    });

    it('should NOT prune expired but important tasks', async () => {
        const now = Date.now();
        const longAgo = now - (24 * 3600 * 1000 * 2);
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
