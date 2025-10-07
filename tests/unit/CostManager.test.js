import CostManager from '../../core/reasoner/CostManager.js';
import ConfigManager from '../../core/config/ConfigManager.js';

// Import actual implementations instead of mocking
import Term from '../../core/core/Term.js';

describe('CostManager', () => {
    let memory;
    let configManager;
    let costManager;

    beforeEach(() => {
        // Create a minimal memory implementation instead of heavy mocking
        memory = {
            indexer: {
                beliefIndex: new Map(),
                implicationIndex: new Map(),
                costIndex: new Map(),
            },
            getTerm: (key) => new Term(key)
        };

        // Create a real ConfigManager instance with custom config instead of mock
        configManager = new ConfigManager({COST_MANAGER: {defaultCost: 1}});

        costManager = new CostManager(memory, configManager);
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
            
            // Create proper belief objects with truth values
            memory.indexer.beliefIndex.set(precond1.key, {
                state: {
                    truthValue: {
                        confidence: 0.9
                    }
                }
            });
            
            // Create method with proper structure
            const method = {
                subject: {
                    type: 'SequentialConjunction',
                    terms: [taskTerm, precond1, precond2]
                }
            };
            
            memory.indexer.implicationIndex.set(taskTerm.key, [method]);
            expect(costManager.getTaskDifficulty(taskTerm)).toBeCloseTo(1.1, 1); // Increased precision to 1 decimal place
        });

        it('should return the minimum difficulty among multiple methods', () => {
            const taskTerm = new Term('multiMethodTask');
            const precond1 = new Term('precond1');
            const precond2 = new Term('precond2');
            const precond3 = new Term('precond3');
            
            // Set up belief objects with truth values
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
            
            // Calculate method difficulties:
            // method1: [taskTerm, precond1, precond3] -> 1 - 0.9 + 1 - 0.5 = 0.1 + 0.5 = 0.6
            // method2: [taskTerm, precond2, precond3] -> 1 - 0.8 + 1 - 0.5 = 0.2 + 0.5 = 0.7
            // method3: [taskTerm, precond1, precond2] -> 1 - 0.9 + 1 - 0.8 = 0.1 + 0.2 = 0.3
            // The minimum is 0.3 for method3
            
            // Create methods with proper structure
            const method1 = {
                subject: {
                    type: 'SequentialConjunction',
                    terms: [taskTerm, precond1, precond3]
                }
            };
            const method2 = {
                subject: {
                    type: 'SequentialConjunction',
                    terms: [taskTerm, precond2, precond3]
                }
            };
            const method3 = {
                subject: {
                    type: 'SequentialConjunction',
                    terms: [taskTerm, precond1, precond2]
                }
            };
            
            memory.indexer.implicationIndex.set(taskTerm.key, [method1, method2, method3]);
            expect(costManager.getTaskDifficulty(taskTerm)).toBeCloseTo(0.3, 1); // Minimum difficulty of the three methods
        });
    });

    describe('getPlanCost', () => {
        it('should return the sum of the costs of all actions in a plan', () => {
            const action1 = new Term('action1');
            const action2 = new Term('action2');
            const action3 = new Term('action3');
            
            // Set specific costs in the memory
            memory.indexer.costIndex.set('action1', 1);
            memory.indexer.costIndex.set('action2', 5);
            memory.indexer.costIndex.set('action3', 2);
            
            const plan = [action1, action2, action3];
            expect(costManager.getPlanCost(plan)).toBe(8);
        });
    });
});