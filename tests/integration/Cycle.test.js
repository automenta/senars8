import {beforeEach, describe, expect, test, vi} from 'vitest';
import Task from '../../core/core/Task.js';
import Term from '../../core/core/Term.js';
import CONSTITUTION_TASKS from '../../core/system/Constitution.js';
import {createConfig} from '../shared/test-utils.js';
import {createTestSystem} from '../test-setup.js';
import {SystemCommands} from '../../core/system/SystemCommands.js';

vi.mock('@xenova/transformers', () => ({
    pipeline: vi.fn(async () =>
        vi.fn(() => ({
            data: new Float32Array([1, 2, 3])
        }))
    ),
    env: {
        allowLocalModels: false,
        allowRemoteModels: true,
    },
}));

// Local helper to set up command bus mock for system
const setupCommandBusMock = (commandBus, memory) => {
    commandBus.request.mockImplementation(async (command, payload) => {
        if (command === SystemCommands.LM_GENERATE_HYPOTHESES) {
            return [];
        }
        if (command === SystemCommands.LM_EVALUATE_AND_RANK_HYPOTHESES) {
            return payload.hypotheses;
        }
        if (command === SystemCommands.LM_BOOTSTRAP_TERM) {
            return new Term(payload.termKey, [], 1);
        }
        if (command === SystemCommands.LM_ENRICH_TERM) {
            return [];
        }
        if (command === SystemCommands.MEMORY_GET_ALL_TASKS) {
            return await memory.getAllTasks(); // Use public API
        }
        if (command === SystemCommands.MEMORY_GET_TERM) {
            return memory.getTerm(payload); // Use public API
        }
        // Let other commands pass through or return null
        return null;
    });
};

describe('Cycle Integration Test', () => {
    let system, memory, cycle, commandBus;

    beforeEach(() => {
        const config = createConfig('UNIT_TEST', {
            planner: {
                strategy: 'HTN'
            }
        });
        const systemData = createTestSystem(config);
        system = systemData.system;
        memory = systemData.container.get('memory'); // Get memory from container
        cycle = system.cycle;
        commandBus = systemData.commandBus;

        // Mock commandBus requests for LM commands
        setupCommandBusMock(commandBus, memory);
    });

    test('should run a cycle without errors', async () => {
        await expect(cycle.runOnce()).resolves.not.toThrow();
    }, 10000); // 10 second timeout

    test('should prioritize tasks based on relevance to the constitution', async () => {
        // AcquireKnowledge should have a high similarity to constitutional goals
        const term1 = new Term('AcquireKnowledge', [1, 0, 0], 1);
        // cat should have low similarity to constitutional goals
        const term2 = new Term('cat', [0, 0, 1], 1);
        await memory.addTerm(term1);
        await memory.addTerm(term2);

        const task1 = new Task(term1, '!');
        const task2 = new Task(term2, '.');
        await memory.addTasks([task1, task2]);

        await cycle.bootstrap(CONSTITUTION_TASKS);
        await cycle.runOnce();

        const tasks = await memory.getAllTasks(); // Use public API

        // Update priorities manually since the priority manager might not be working in tests
        if (system.priorityManager) {
            tasks.forEach(task => system.priorityManager.updatePriority(task));
        }

        const acquireKnowledgeTask = tasks.find(t => t.termKey === 'AcquireKnowledge');
        const catTask = tasks.find(t => t.termKey === 'cat');

        expect(acquireKnowledgeTask).toBeDefined();
        expect(catTask).toBeDefined();
        expect(acquireKnowledgeTask.state.priority).toBeGreaterThan(catTask.state.priority);
    }, 30000); // 30 second timeout
});