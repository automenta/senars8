import Cycle from '../../src/system/Cycle.js';
import Memory from '../../src/memory/Memory.js';
import Reasoner from '../../src/reasoner/Reasoner.js';
import LM from '../../src/lm/LM.js';
import ActionExecutor from '../../src/system/ActionExecutor.js';
import Task from '../../src/core/Task.js';
import Term from '../../src/core/Term.js';
import config from '../../src/config/index.js';
import Perception from '../../src/system/Perception.js';
import Planner from '../../src/system/Planner.js';
import MetaCognition from '../../src/system/MetaCognition.js';
import TemporalReasoner from '../../src/reasoner/TemporalReasoner.js';
import PriorityManager from '../../src/reasoner/PriorityManager.js';
import ContradictionAnalyzer from '../../src/reasoner/ContradictionAnalyzer.js';
import ResolutionStrategy from '../../src/reasoner/strategies/ResolutionStrategy.js';
import CONSTITUTION_TASKS from '../../src/system/Constitution.js';

jest.mock('../../src/lm/LM.js');

jest.mock('@xenova/transformers', () => {
    const transformers = jest.createMockFromModule('@xenova/transformers');
    transformers.pipeline = jest.fn(async () => {
        return jest.fn(() => ({
            data: new Float32Array([1, 2, 3])
        }));
    });
    return transformers;
});

describe('Cycle Integration Test', () => {
    let memory, reasoner, lm, cycle;

    beforeEach(() => {
        // Manually assemble the components as the SystemFactory would
        memory = new Memory();
        lm = new LM();
        const temporalReasoner = new TemporalReasoner();
        // Use BruteForceStrategy for deterministic test results
        reasoner = new Reasoner({temporalReasoner}, {strategy: 'BruteForce'});
        const actionExecutor = new ActionExecutor(memory);

        // Cycle-specific components
        const perception = new Perception(memory, lm);
        const planner = new Planner(memory, lm, actionExecutor, config.planner);
        const contradictionAnalyzer = new ContradictionAnalyzer();
        const resolutionStrategy = new ResolutionStrategy();
        const metaCognition = new MetaCognition(config, {contradictionAnalyzer, resolutionStrategy});
        const priorityManager = new PriorityManager(memory);

        // Create the cycle with the new constructor signature
        cycle = new Cycle(config, {
            memory,
            reasoner,
            lm,
            actionExecutor,
            perception,
            planner,
            metaCognition,
            temporalReasoner,
            priorityManager
        });


        lm.generateHypotheses.mockResolvedValue([]);
        lm.evaluateAndRankHypotheses.mockImplementation(async (tasks, hypotheses) => hypotheses);
        lm.bootstrapTerm.mockImplementation(async termKey => {
            return new Term(termKey, [], 1);
        });
        lm.proactiveEnrichment.mockResolvedValue([]);
    });

    test('should run a cycle without errors', async () => {
        await expect(cycle.runOnce()).resolves.not.toThrow();
    });

    test('should prioritize tasks based on relevance to the constitution', async () => {
        const term1 = new Term('AcquireKnowledge', [1, 0, 0], 1);
        const term2 = new Term('cat', [0, 1, 0], 1);
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
    });
});
