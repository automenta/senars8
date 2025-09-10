import CostManager from '../../src/reasoner/CostManager.js';
import Term from '../../src/core/Term.js';
import Memory from '../../src/memory/Memory.js';

// Mock Term and Memory for testing purposes
jest.mock('../../src/core/Term.js', () => {
    return jest.fn().mockImplementation((key) => {
        const termInstance = {
            key: key,
            type: 'Atomic',
            subject: null,
            predicate: null,
            terms: [],
            equals: jest.fn(otherTerm => {
                return otherTerm && termInstance.key === otherTerm.key;
            }),
        };
        // Allow setting properties for more complex test cases
        return new Proxy(termInstance, {
            set: (target, prop, value) => {
                target[prop] = value;
                return true;
            }
        });
    });
});
jest.mock('../../src/memory/Memory.js');

describe('CostManager', () => {
    let memory;
    let costManager;

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();

        // Setup mock memory
        memory = new Memory();
        memory.beliefIndex = new Map();
        memory.implicationIndex = new Map();
        memory.costIndex = new Map();
        memory.getTerm = jest.fn(key => new Term(key));

        // Initialize CostManager with mock memory
        costManager = new CostManager(memory);
    });

    describe('getActionCost', () => {
        it('should return the default cost if no specific cost belief is found', () => {
            const actionTerm = new Term('action1');
            expect(costManager.getActionCost(actionTerm)).toBe(1);
        });

        it('should return the cost from the memory.costIndex if it exists', () => {
            const actionTerm = new Term('action2');

            // Mock the costIndex
            memory.costIndex = new Map();
            memory.costIndex.set('action2', 5);

            expect(costManager.getActionCost(actionTerm)).toBe(5);
        });
    });

    describe('getTaskDifficulty (Enhanced Heuristic)', () => {
        it('should return the action cost for a primitive task', () => {
            const taskTerm = new Term('primitiveTask');
            memory.implicationIndex.set(taskTerm.key, []); // No decomposition methods
            memory.costIndex.set(taskTerm.key, 5); // Action cost is 5
            expect(costManager.getTaskDifficulty(taskTerm)).toBe(5);
        });

        it('should calculate difficulty based on precondition confidence', () => {
            const taskTerm = new Term('complexTask');
            const precond1 = new Term('precond1'); // Believed, confidence 0.9
            const precond2 = new Term('precond2'); // Unknown, confidence 0

            memory.beliefIndex.set(precond1.key, {state: {truthValue: {confidence: 0.9}}});

            const method = new Term('method1');
            method.subject = {type: 'SequentialConjunction', terms: [taskTerm, precond1, precond2]};

            memory.implicationIndex.set(taskTerm.key, [method]);

            // Difficulty = (1 - 0.9) + (1 - 0) = 0.1 + 1 = 1.1
            expect(costManager.getTaskDifficulty(taskTerm)).toBeCloseTo(1.1);
        });

        it('should return the minimum difficulty among multiple methods', () => {
            const taskTerm = new Term('multiMethodTask');
            const precond1 = new Term('precond1'); // Conf 0.9 -> Diff 0.1
            const precond2 = new Term('precond2'); // Conf 0.8 -> Diff 0.2
            const precond3 = new Term('precond3'); // Conf 0.5 -> Diff 0.5

            memory.beliefIndex.set(precond1.key, {state: {truthValue: {confidence: 0.9}}});
            memory.beliefIndex.set(precond2.key, {state: {truthValue: {confidence: 0.8}}});
            memory.beliefIndex.set(precond3.key, {state: {truthValue: {confidence: 0.5}}});

            const method1 = new Term('method1');
            method1.subject = {type: 'SequentialConjunction', terms: [taskTerm, precond1, precond3]};

            const method2 = new Term('method2');
            method2.subject = {type: 'SequentialConjunction', terms: [taskTerm, precond2, precond3]};

            const method3 = new Term('method3');
            method3.subject = {type: 'SequentialConjunction', terms: [taskTerm, precond1, precond2]};

            memory.implicationIndex.set(taskTerm.key, [method1, method2, method3]);

            expect(costManager.getTaskDifficulty(taskTerm)).toBeCloseTo(0.3);
        });
    });

    describe('getPlanCost', () => {
        it('should return the sum of the costs of all actions in a plan', () => {
            const action1 = new Term('action1');
            const action2 = new Term('action2');
            const action3 = new Term('action3');
            const plan = [action1, action2, action3];

            // Mock getActionCost to return specific values
            jest.spyOn(costManager, 'getActionCost').mockImplementation(action => {
                if (action.key === 'action1') return 1;
                if (action.key === 'action2') return 5;
                if (action.key === 'action3') return 2;
                return 0;
            });

            expect(costManager.getPlanCost(plan)).toBe(8);
        });
    });
});
