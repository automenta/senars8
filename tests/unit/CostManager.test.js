import CostManager from '../../core/reasoner/CostManager.js';
import Term from '../../core/core/Term.js';
import ConfigManager from '../../core/config/ConfigManager.js';
import { SystemCommands } from '../../core/system/SystemCommands.js';

vi.mock('../../core/core/Term.js', () => ({
    default: vi.fn().mockImplementation(key => ({
        key,
        // other properties as needed by tests
    })),
}));

describe('CostManager', () => {
    let commandBus;
    let configManager;
    let costManager;

    beforeEach(() => {
        vi.clearAllMocks();

        commandBus = {
            request: vi.fn(),
        };

        configManager = new ConfigManager();

        costManager = new CostManager(commandBus, configManager);
    });

    describe('getActionCost', () => {
        it('should return the default cost if no specific cost is found', async () => {
            const actionTerm = new Term('action1');
            commandBus.request.mockResolvedValue(null);
            await expect(costManager.getActionCost(actionTerm)).resolves.toBe(1);
        });

        it('should return the cost from memory if it exists', async () => {
            const actionTerm = new Term('action2');
            commandBus.request.mockResolvedValue(5);
            await expect(costManager.getActionCost(actionTerm)).resolves.toBe(5);
            expect(commandBus.request).toHaveBeenCalledWith(SystemCommands.MEMORY_GET_COST, 'action2');
        });
    });

    describe('getTaskDifficulty (Enhanced Heuristic)', () => {
        it('should return the action cost for a primitive task', async () => {
            const taskTerm = new Term('primitiveTask');
            commandBus.request
                .mockResolvedValueOnce([]) // No implications
                .mockResolvedValueOnce(5); // Cost is 5
            await expect(costManager.getTaskDifficulty(taskTerm)).resolves.toBe(5);
        });

        it('should calculate difficulty based on precondition confidence', async () => {
            const taskTerm = new Term('complexTask');
            const precond1 = new Term('precond1');
            const precond2 = new Term('precond2');
            const method = {
                subject: {
                    type: 'SequentialConjunction',
                    terms: [taskTerm, precond1, precond2]
                }
            };

            commandBus.request
                .mockResolvedValueOnce([method]) // Return one implication method
                .mockResolvedValueOnce([{ state: { truthValue: { confidence: 0.9 } } }]) // Belief for precond1
                .mockResolvedValueOnce([]); // No belief for precond2

            await expect(costManager.getTaskDifficulty(taskTerm)).resolves.toBeCloseTo(1.1);
        });

        it('should return the minimum difficulty among multiple methods', async () => {
            const taskTerm = new Term('multiMethodTask');
            const precond1 = new Term('precond1');
            const precond2 = new Term('precond2');
            const precond3 = new Term('precond3');

            const method1 = { subject: { type: 'SequentialConjunction', terms: [taskTerm, precond1, precond3] } }; // Difficulty: (1-0.9) + (1-0.5) = 0.6
            const method2 = { subject: { type: 'SequentialConjunction', terms: [taskTerm, precond2, precond3] } }; // Difficulty: (1-0.8) + (1-0.5) = 0.7
            const method3 = { subject: { type: 'SequentialConjunction', terms: [taskTerm, precond1, precond2] } }; // Difficulty: (1-0.9) + (1-0.8) = 0.3

            commandBus.request
                .mockResolvedValueOnce([method1, method2, method3]) // Implications
                // Method 1
                .mockResolvedValueOnce([{ state: { truthValue: { confidence: 0.9 } } }]) // precond1
                .mockResolvedValueOnce([{ state: { truthValue: { confidence: 0.5 } } }]) // precond3
                // Method 2
                .mockResolvedValueOnce([{ state: { truthValue: { confidence: 0.8 } } }]) // precond2
                .mockResolvedValueOnce([{ state: { truthValue: { confidence: 0.5 } } }]) // precond3
                // Method 3
                .mockResolvedValueOnce([{ state: { truthValue: { confidence: 0.9 } } }]) // precond1
                .mockResolvedValueOnce([{ state: { truthValue: { confidence: 0.8 } } }]) // precond2


            await expect(costManager.getTaskDifficulty(taskTerm)).resolves.toBeCloseTo(0.3);
        });
    });

    describe('getPlanCost', () => {
        it('should return the sum of the costs of all actions in a plan', async () => {
            const plan = [new Term('action1'), new Term('action2'), new Term('action3')];
            commandBus.request
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(5)
                .mockResolvedValueOnce(2);

            await expect(costManager.getPlanCost(plan)).resolves.toBe(8);
        });
    });
});