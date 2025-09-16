import Cycle from '../../src/system/Cycle.js';
import Memory from '../../src/memory/Memory.js';
import Reasoner from '../../src/reasoner/Reasoner.js';
import LM from '../../src/lm/LM.js';
import ActionExecutor from '../../src/system/ActionExecutor.js';
import Task from '../../src/core/Task.js';
import Term from '../../src/core/Term.js';
import {parseTerm} from '../../src/parser/narseseParser.js';
import config from '../../src/config/index.js';
import Perception from '../../src/system/Perception.js';
import Planner from '../../src/system/Planner.js';
import MetaCognition from '../../src/system/MetaCognition.js';
import TemporalReasoner from '../../src/reasoner/TemporalReasoner.js';
import PriorityManager from '../../src/reasoner/PriorityManager.js';
import ContradictionAnalyzer from '../../src/reasoner/ContradictionAnalyzer.js';
import ResolutionStrategy from '../../src/reasoner/strategies/ResolutionStrategy.js';
import CONSTITUTION_TASKS from '../../src/system/Constitution.js';

// Mock the LM to avoid loading heavy models
jest.mock('../../src/lm/LM.js');
jest.mock('@xenova/transformers', () => {
    const transformers = jest.createMockFromModule('@xenova/transformers');
    transformers.pipeline = jest.fn(async () => {
        // Return a mock function for feature extraction
        return jest.fn(term => ({
            data: new Float32Array(term.length) // Return a dummy embedding
        }));
    });
    return transformers;
});


describe('Contradiction Resolution in Cycle', () => {
    let memory, reasoner, lm, cycle;

    beforeEach(async () => {
        // Manually assemble the components as the SystemFactory would
        memory = new Memory();
        lm = new LM();
        const temporalReasoner = new TemporalReasoner();
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

        // Mock LM methods
        lm.generateHypotheses.mockResolvedValue([]);
        lm.evaluateAndRankHypotheses.mockImplementation(async (tasks, hypotheses) => hypotheses);
        lm.bootstrapTerm.mockImplementation(async termKey => {
            const term = new Term(termKey, [1, 2, 3], 1);
            memory.addTerm(term);
            return term;
        });
        lm.proactiveEnrichment.mockResolvedValue([]);

        // Bootstrap constitution terms
        await cycle.bootstrap(CONSTITUTION_TASKS);
    });

    test('should apply revision strategy for high-severity contradictions', async () => {
        // 1. Setup: Add two directly contradictory beliefs with different confidences
        const termKey1 = '(bird --> fly)';
        const termKey2 = '(--, (bird --> fly))';

        await lm.bootstrapTerm(termKey1);
        await lm.bootstrapTerm(termKey2);

        const task1 = new Task(parseTerm(termKey1), '.', {
            frequency: 1.0,
            confidence: 0.9
        });
        const task2 = new Task(parseTerm(termKey2), '.', {
            frequency: 1.0,
            confidence: 0.8
        }); // Lower confidence

        memory.addTasks([task1, task2]);

        // 2. Run the cycle
        const result = await cycle.runOnce();

        // 3. Assertions
        expect(result.contradictions).toBe(1);

        const revisedTask = memory.getTask(task2.id);
        const originalTask = memory.getTask(task1.id);

        // The weaker task's confidence should be significantly reduced
        expect(revisedTask.state.truthValue.confidence).toBeLessThan(0.8);
        expect(revisedTask.state.truthValue.confidence).toBe(0.8 * config.system.CONFIDENCE_REDUCTION_FACTOR);
        // The stronger task's confidence should remain unchanged
        expect(originalTask.state.truthValue.confidence).toBe(0.9);

        // A meta-task should be created to investigate the source of the revised belief
        const metaTask = memory.getAllTasks().find(t => t.termKey.startsWith('(&, investigate_source'));
        expect(metaTask).toBeDefined();
        expect(metaTask.termKey).toBe(`(&, investigate_source, ${termKey2})`);
        expect(metaTask.punctuation).toBe('!');
        expect(metaTask.state.priority).toBe(config.META_TASK_PRIORITY);
    });

    test('should apply evidence gathering strategy for moderate-severity contradictions', async () => {
        // 1. Setup: Add a belief and its negated inheritance counterpart
        const termKey1 = '(swan --> white)';
        const termKey2 = '(swan --> (--, white))'; // This is an inheritance conflict

        await lm.bootstrapTerm(termKey1);
        await lm.bootstrapTerm(termKey2);
        await lm.bootstrapTerm('(--, white)'); // Also bootstrap the inner term

        const task1 = new Task(parseTerm(termKey1), '.', {
            frequency: 1.0,
            confidence: 0.7
        });
        const task2 = new Task(parseTerm(termKey2), '.', {
            frequency: 1.0,
            confidence: 0.6 // Slightly lower confidence to make severity moderate
        });

        memory.addTasks([task1, task2]);

        // 2. Run the cycle
        const result = await cycle.runOnce();

        // 3. Assertions
        expect(result.contradictions).toBe(1);

        // Original tasks' confidences should not change for evidence gathering
        const originalTask1 = memory.getTask(task1.id);
        const originalTask2 = memory.getTask(task2.id);
        expect(originalTask1.state.truthValue.confidence).toBe(0.7);
        expect(originalTask2.state.truthValue.confidence).toBe(0.6);

        // A meta-task should be created for causal analysis, which is now the default for this kind of conflict
        const metaTask = memory.getAllTasks().find(t => t.termKey.startsWith('(&, causal_analysis'));
        expect(metaTask).toBeDefined();
        expect(metaTask.punctuation).toBe('!');
    });
});
