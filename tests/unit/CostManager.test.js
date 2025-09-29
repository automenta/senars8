import CostManager from '../../core/reasoner/CostManager.js';

vi.mock('../../core/core/Term.js', () => ({
    default: vi.fn().mockImplementation(key => {
        const termInstance = {
            key,
            type: 'Atomic',
            subject: null,
            predicate: null,
            terms: [],
            equals: vi.fn(otherTerm => otherTerm && termInstance.key === otherTerm.key),
        };
        return new Proxy(termInstance, {
            set: (target, prop, value) => {
                target[prop] = value;
                return true;
            },
        });
    }),
}));

vi.mock('../../core/memory/Memory.js', () => ({
    default: vi.fn().mockImplementation(() => ({
        indexer: {
            beliefIndex: new Map(),
            implicationIndex: new Map(),
            costIndex: new Map(),
        },
        getTerm: vi.fn(key => new Term(key)),
    })),
}));

const {default: Term} = await import('../../core/core/Term.js');
const {default: Memory} = await import('../../core/memory/Memory.js');

describe('CostManager', () => {
    let memory;
    let costManager;

    beforeEach(() => {
        vi.clearAllMocks();
        memory = new Memory();
        memory.indexer = {
            beliefIndex: new Map(),
            implicationIndex: new Map(),
            costIndex: new Map(),
        };
        memory.getTerm = vi.fn(key => new Term(key));
        costManager = new CostManager(memory);
    });

    describe('getActionCost', () => {
        it('should return the default cost if no specific cost is found', () => {
            const actionTerm = new Term('action1');
            expect(costManager.getActionCost(actionTerm)).toBe(1);
        });

        it('should return the cost from memory.costIndex if it exists', () => {
            const actionTerm = new Term('action2');
            memory.indexer.costIndex.set('action2', 5);
            expect(costManager.getActionCost(actionTerm)).toBe(5);
        });
    });

    describe('getTaskDifficulty (Enhanced Heuristic)', () => {
        it('should return the action cost for a primitive task', () => {
            const taskTerm = new Term('primitiveTask');
            memory.indexer.implicationIndex.set(taskTerm.key, []);
            memory.indexer.costIndex.set(taskTerm.key, 5);
            expect(costManager.getTaskDifficulty(taskTerm)).toBe(5);
        });

        it('should calculate difficulty based on precondition confidence', () => {
            const taskTerm = new Term('complexTask');
            const precond1 = new Term('precond1');
            const precond2 = new Term('precond2');
            memory.indexer.beliefIndex.set(precond1.key, {
                state: {
                    truthValue: {
                        confidence: 0.9
                    }
                }
            });
            const method = new Term('method1');
            method.subject = {
                type: 'SequentialConjunction',
                terms: [taskTerm, precond1, precond2]
            };
            memory.indexer.implicationIndex.set(taskTerm.key, [method]);
            expect(costManager.getTaskDifficulty(taskTerm)).toBeCloseTo(1.1);
        });

        it('should return the minimum difficulty among multiple methods', () => {
            const taskTerm = new Term('multiMethodTask');
            const precond1 = new Term('precond1');
            const precond2 = new Term('precond2');
            const precond3 = new Term('precond3');
            memory.indexer.beliefIndex.set(precond1.key, {
                state: {
                    truthValue: {
                        confidence: 0.9
                    }
                }
            });
            memory.indexer.beliefIndex.set(precond2.key, {
                state: {
                    truthValue: {
                        confidence: 0.8
                    }
                }
            });
            memory.indexer.beliefIndex.set(precond3.key, {
                state: {
                    truthValue: {
                        confidence: 0.5
                    }
                }
            });
            const method1 = new Term('method1');
            method1.subject = {
                type: 'SequentialConjunction',
                terms: [taskTerm, precond1, precond3]
            };
            const method2 = new Term('method2');
            method2.subject = {
                type: 'SequentialConjunction',
                terms: [taskTerm, precond2, precond3]
            };
            const method3 = new Term('method3');
            method3.subject = {
                type: 'SequentialConjunction',
                terms: [taskTerm, precond1, precond2]
            };
            memory.indexer.implicationIndex.set(taskTerm.key, [method1, method2, method3]);
            expect(costManager.getTaskDifficulty(taskTerm)).toBeCloseTo(0.3);
        });
    });

    describe('getPlanCost', () => {
        it('should return the sum of the costs of all actions in a plan', () => {
            const plan = [new Term('action1'), new Term('action2'), new Term('action3')];
            vi.spyOn(costManager, 'getActionCost')
                .mockReturnValueOnce(1)
                .mockReturnValueOnce(5)
                .mockReturnValueOnce(2);
            expect(costManager.getPlanCost(plan)).toBe(8);
        });
    });
});