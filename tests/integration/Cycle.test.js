import {beforeEach, describe, expect, test, vi} from 'vitest';
import Task from '../../core/core/Task.js';
import Term from '../../core/core/Term.js';
import CONSTITUTION_TASKS from '../../core/system/Constitution.js';

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

const {default: SystemFactory} = await import('../../core/system/SystemFactory.js');

describe('Cycle Integration Test', () => {
    let system, memory, cycle;

    beforeEach(() => {
        system = SystemFactory.createSystem({
            reasoner: {
                strategy: 'BruteForce'
            },
            planner: {
                strategy: 'HTN'
            }
        });
        memory = system.memory;
        cycle = system.cycle;
        const lm = system.lm;

        // Mock LM methods
        vi.spyOn(lm, 'generateHypotheses').mockResolvedValue([]);
        vi.spyOn(lm, 'evaluateAndRankHypotheses').mockImplementation(async (_, hypotheses) => hypotheses);
        vi.spyOn(lm, 'bootstrapTerm').mockImplementation(async termKey => new Term(termKey, [], 1));
        vi.spyOn(lm, 'proactiveEnrichment').mockResolvedValue([]);
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

        const tasks = memory.getAllTasks();
        const acquireKnowledgeTask = tasks.find(t => t.termKey === 'AcquireKnowledge');
        const catTask = tasks.find(t => t.termKey === 'cat');

        expect(acquireKnowledgeTask.state.priority).toBeGreaterThan(catTask.state.priority);
    }, 30000); // 30 second timeout
});