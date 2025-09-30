import Memory from '../../core/memory/Memory.js';
import Task from '../../core/core/Task.js';
import {parseTerm} from '../../core/parser/narseseParser.js';
import ConfigManager from '../../core/config/ConfigManager.js';
import configService from '../../core/config/ConfigService.js';

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
        // Reset the config service to ensure clean state for each test
        configService.reset();

        const configManager = createTestConfig();
        // Initialize configService with test config
        configService.initialize(configManager.getAll());

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

    it('should prune expired, unimportant tasks during maintenance', async () => {
        const {SystemEvents} = await import('../../core/system/SystemEvents.js');
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

        // Manually trigger the event handler
        const systemCycleEndedHandler = memory.eventBus.on.mock.calls.find(call => call[0] === SystemEvents.CYCLE_COMPLETE)[1];
        systemCycleEndedHandler();

        expect(memory.shortTermTasks.size).toBe(1);
        expect(memory.shortTermTasks.has(task2.id)).toBe(true);
    });

    it('should NOT prune expired but important tasks', async () => {
        const {SystemEvents} = await import('../../core/system/SystemEvents.js');
        const now = Date.now();
        const longAgo = now - (24 * 3600 * 1000 * 2);
        const task1 = createTask('(important_and_old --> property)', {
            lastAccessed: longAgo,
            priority: 0.9
        });
        await memory.addTasks([task1]);
        expect(memory.shortTermTasks.size).toBe(1);

        // Manually trigger the event handler
        const systemCycleEndedHandler = memory.eventBus.on.mock.calls.find(call => call[0] === SystemEvents.CYCLE_COMPLETE)[1];
        systemCycleEndedHandler();

        expect(memory.shortTermTasks.size).toBe(1);
        expect(memory.shortTermTasks.has(task1.id)).toBe(true);
    });
});