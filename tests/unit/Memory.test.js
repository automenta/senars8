const Memory = require('../../src/memory/Memory');
const Task = require('../../src/core/Task');
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
jest.mock('../../src/core/Task'); // Hoisted
jest.mock('../../src/system/EventBus', () => ({
    on: jest.fn(),
    emit: jest.fn(),
}));

describe('Memory', () => {
    let memory;

    beforeEach(() => {
        Term.mockClear();
        Task.mockClear();
        EventBus.on.mockClear();

        // Configure the mock implementation for Task for each test
        Task.mockImplementation((term, punctuation) => {
            const mockTaskInstance = Object.create(Task.prototype);
            return Object.assign(mockTaskInstance, {
                id: `task-${Math.random()}`,
                term: term,
                termKey: term.key,
                punctuation: punctuation,
                state: {},
            });
        });

        memory = new Memory();
    });

    describe('costIndex', () => {
        it('should add a cost to the costIndex when a cost belief is added', () => {
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
            const regularTerm = new Term('<cat --> animal>');
            regularTerm.type = 'Inheritance';
            regularTerm.subject = new Term('cat');
            regularTerm.predicate = new Term('animal');

            const belief = new Task(regularTerm, '.');

            memory.addTasks([belief]);

            expect(memory.costIndex.size).toBe(0);
        });

        it('should remove a cost from the costIndex when a cost belief is removed', () => {
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
});
