const Memory = require('../../src/memory/Memory');
const Term = require('../../src/core/Term');
const EventBus = require('../../src/system/EventBus');

// Mock dependencies
jest.mock('../../src/core/Term', () => {
    return jest.fn().mockImplementation((key) => {
        const termInstance = {
            key: key,
            type: 'Atomic',
            subject: null,
            predicate: null,
            terms: [],
        };
        return new Proxy(termInstance, {
            set: (target, prop, value) => {
                target[prop] = value;
                return true;
            }
        });
    });
});
// Mock dependencies
jest.mock('../../src/core/Term', () => {
    return jest.fn().mockImplementation((key) => {
        const termInstance = {
            key: key,
            type: 'Atomic',
            subject: null,
            predicate: null,
            terms: [],
        };
        return new Proxy(termInstance, {
            set: (target, prop, value) => {
                target[prop] = value;
                return true;
            }
        });
    });
});
jest.unmock('../../src/core/Task');
const Task = require('../../src/core/Task');

jest.mock('../../src/system/EventBus', () => ({
    on: jest.fn(),
    emit: jest.fn(),
    off: jest.fn(),
}));

describe('Memory', () => {
    let memory;

    beforeEach(() => {
        Term.mockClear();
        EventBus.on.mockClear();

    });

    describe('costIndex', () => {
        it('should add a cost to the costIndex when a cost belief is added', () => {
            memory = new Memory();
            const actionTerm = new Term('action1');
            const costTerm = new Term('<action1 --> [10]>');
            costTerm.type = 'Inheritance';
            costTerm.subject = actionTerm;
            costTerm.predicate = { type: 'IntensionalSet', terms: [{ key: '10' }] };

            const belief = new Task(costTerm, '.');

            memory.addTasks([belief]);

            expect(memory.costIndex.has('action1')).toBe(true);
            expect(memory.costIndex.get('action1')).toBe(10);
        });

        it('should not add a cost for non-cost beliefs', () => {
            memory = new Memory();
            const regularTerm = new Term('<cat --> animal>');
            regularTerm.type = 'Inheritance';
            regularTerm.subject = new Term('cat');
            regularTerm.predicate = new Term('animal');

            const belief = new Task(regularTerm, '.');

            memory.addTasks([belief]);

            expect(memory.costIndex.size).toBe(0);
        });

        it('should remove a cost from the costIndex when a cost belief is removed', () => {
            memory = new Memory();
            // Add the belief first
            const actionTerm = new Term('action2');
            const costTerm = new Term('<action2 --> [20]>');
            costTerm.type = 'Inheritance';
            costTerm.subject = actionTerm;
            costTerm.predicate = { type: 'IntensionalSet', terms: [{ key: '20' }] };
            const belief = new Task(costTerm, '.');
            belief.id = 'task123'; // Assign an ID for removal

            memory.addTasks([belief]);
            expect(memory.costIndex.get('action2')).toBe(20);

            // Now remove it
            memory.removeTask(belief.id);

            expect(memory.costIndex.has('action2')).toBe(false);
        });
    });

    describe('Memory Maintenance', () => {
        let config;

        beforeEach(() => {
            jest.resetModules(); // Important to reset modules to re-evaluate config
            config = require('../../src/config');
            config.memory = {
                FORGETTING_STRATEGY_NAME: 'TimeBased',
                FORGETTING_STRATEGY_OPTIONS: { expirationThreshold: 100n },
                MAINTENANCE_CYCLE_FREQUENCY: 2,
                CONSOLIDATION_PRIORITY_THRESHOLD: 0.8,
                CONSOLIDATION_CONFIDENCE_THRESHOLD: 0.9,
            };
            memory = new Memory();
        });

        it('should subscribe to SystemCycleEnded event', () => {
            expect(EventBus.on).toHaveBeenCalledWith('SystemCycleEnded', expect.any(Function));
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should consolidate high-priority tasks from short-term to long-term memory', () => {
            const highPriorityTask = new Task(new Term('high_priority'), '.');
            highPriorityTask.state.priority = 0.9;
            const lowPriorityTask = new Task(new Term('low_priority'), '.');
            lowPriorityTask.state.priority = 0.5;
            lowPriorityTask.state.truthValue.confidence = 0.5; // Ensure it's below confidence threshold

            memory.addTasks([highPriorityTask, lowPriorityTask]);
            expect(memory.shortTermTasks.size).toBe(2);
            expect(memory.longTermTasks.size).toBe(0);

            memory._consolidateMemory();

            expect(memory.shortTermTasks.size).toBe(1);
            expect(memory.longTermTasks.size).toBe(1);
            expect(memory.longTermTasks.has(highPriorityTask.id)).toBe(true);
            expect(memory.shortTermTasks.has(lowPriorityTask.id)).toBe(true);
        });

        it('should consolidate high-confidence tasks from short-term to long-term memory', () => {
            const highConfidenceTask = new Task(new Term('high_confidence'), '.');
            highConfidenceTask.state.truthValue.confidence = 0.95;
            const lowConfidenceTask = new Task(new Term('low_confidence'), '.');
            lowConfidenceTask.state.truthValue.confidence = 0.5;

            memory.addTasks([highConfidenceTask, lowConfidenceTask]);
            memory._consolidateMemory();

            expect(memory.longTermTasks.has(highConfidenceTask.id)).toBe(true);
            expect(memory.shortTermTasks.has(lowConfidenceTask.id)).toBe(true);
        });

        it('should prune expired tasks from short-term memory', () => {
            jest.useFakeTimers();

            const task1 = new Task(new Term('task1'), '.');
            memory.addTasks([task1]);

            jest.advanceTimersByTime(150); // Exceeds expirationThreshold of 100

            const task2 = new Task(new Term('task2'), '.');
            memory.addTasks([task2]);

            memory._pruneMemory();

            expect(memory.shortTermTasks.size).toBe(1);
            expect(memory.shortTermTasks.has(task2.id)).toBe(true);
        });
    });
});
