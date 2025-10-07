import {vi} from 'vitest';
import Memory from '../../core/memory/Memory.js';
import Task from '../../core/core/Task.js';
import {parseTerm} from '../../core/parser/narseseParser.js';
import ConfigManager from '../../core/config/ConfigManager.js';
import configService from '../../core/config/ConfigService.js';
import {SYSTEM_CONSTANTS} from '../../core/config/constants.js';
import {TEST_CONSTANTS} from '../test-constants.js';

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

        // Create eventBus that can store registered handlers for testing, without heavy vi.fn mocks
        const eventHandlers = new Map();
        const minimalEventBus = {
            on: (event, handler) => {
                const handlers = eventHandlers.get(event) || [];
                handlers.push(handler);
                eventHandlers.set(event, handlers);
            },
            emit: () => Promise.resolve(),
            emitAsync: () => Promise.resolve(),
            // Add a method to get handlers for testing
            getHandlers: (event) => eventHandlers.get(event) || [],
            // Add a method to trigger handlers for testing
            trigger: (event, ...args) => {
                const handlers = eventHandlers.get(event) || [];
                return Promise.all(handlers.map(handler => handler(...args)));
            }
        };
        const minimalCommandBus = {
            handle: () => {}, // no-op function
            request: () => Promise.resolve(null), // return resolved promise with null
        };
        memory = new Memory(configManager, minimalEventBus, minimalCommandBus);
    });

    it('should prune expired, unimportant tasks during maintenance', async () => {
        const {SystemEvents} = await import('../../core/system/SystemEvents.js');
        const now = Date.now();
        const longAgo = now - (24 * 3600 * 1000 * 2);
        const task1 = createTask('(unimportant_and_old --> property)', {
            lastAccessed: longAgo,
            priority: SYSTEM_CONSTANTS.DEFAULT_PRIORITIES.LOW,
            confidence: SYSTEM_CONSTANTS.DEFAULT_TRUTH_VALUES.VERY_LOW.confidence,
        });
        const task2 = createTask('(new_and_unimportant --> property)', {
            confidence: SYSTEM_CONSTANTS.DEFAULT_TRUTH_VALUES.MEDIUM.confidence
        });
        await memory.addTasks([task1, task2]);
        expect(memory.shortTermTasks.size).toBe(2);

        // Manually trigger the event handler using our new trigger method
        await memory.eventBus.trigger(SystemEvents.CYCLE_COMPLETE);

        expect(memory.shortTermTasks.size).toBe(1);
        expect(memory.shortTermTasks.has(task2.id)).toBe(true);
    });

    it('should NOT prune expired but important tasks', async () => {
        const {SystemEvents} = await import('../../core/system/SystemEvents.js');
        const now = Date.now();
        const longAgo = now - (24 * 3600 * 1000 * 2);
        const task1 = createTask('(important_and_old --> property)', {
            lastAccessed: longAgo,
            priority: SYSTEM_CONSTANTS.DEFAULT_PRIORITIES.HIGH
        });
        await memory.addTasks([task1]);
        expect(memory.shortTermTasks.size).toBe(1);

        // Manually trigger the event handler using our new trigger method
        await memory.eventBus.trigger(SystemEvents.CYCLE_COMPLETE);

        expect(memory.shortTermTasks.size).toBe(1);
        expect(memory.shortTermTasks.has(task1.id)).toBe(true);
    });
});