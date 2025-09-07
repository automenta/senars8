const Cycle = require('../src/system/Cycle');
const Memory = require('../src/memory/Memory');
const Reasoner = require('../src/reasoner/Reasoner');
const LM = require('../src/lm/LM');
const ActionExecutor = require('../src/system/ActionExecutor');
const Task = require('../src/core/Task');
const Term = require('../src/core/Term');
const {
    parseTerm
} = require('../src/parser/narseseParser');

// Mock the LM to avoid loading heavy models
jest.mock('../src/lm/LM');
jest.mock('@xenova/transformers', () => {
    const transformers = jest.genMockFromModule('@xenova/transformers');
    transformers.pipeline = jest.fn(async () => {
        // Return a mock function for feature extraction
        return jest.fn((term) => ({
            data: new Float32Array(term.length), // Return a dummy embedding
        }));
    });
    return transformers;
});


describe('Contradiction Resolution in Cycle', () => {
    let memory, reasoner, lm, cycle;

    beforeEach(async () => {
        memory = new Memory();
        reasoner = new Reasoner();
        lm = new LM();
        const actionExecutor = new ActionExecutor(memory);
        cycle = new Cycle(memory, reasoner, lm, actionExecutor);

        // Mock LM methods
        lm.generateHypotheses.mockResolvedValue([]);
        lm.evaluateAndRankHypotheses.mockImplementation(async (tasks, hypotheses) => hypotheses);
        lm.bootstrapTerm.mockImplementation(async (termKey) => {
            const term = new Term(termKey, [1, 2, 3], 1);
            memory.addTerm(term);
            return term;
        });
        lm.proactiveEnrichment.mockResolvedValue([]);

        // Bootstrap constitution terms
        await cycle.bootstrap();
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
        expect(revisedTask.state.truthValue.confidence).toBe(0.8 * 0.1); // 0.08
        // The stronger task's confidence should remain unchanged
        expect(originalTask.state.truthValue.confidence).toBe(0.9);

        // A meta-task should be created to investigate the source of the revised belief
        const metaTask = memory.getAllTasks().find(t => t.termKey.startsWith('(&, investigate_source'));
        expect(metaTask).toBeDefined();
        expect(metaTask.termKey).toBe(`(&, investigate_source, ${termKey2})`);
        expect(metaTask.punctuation).toBe('!');
        expect(metaTask.state.priority).toBe(0.9); // META_TASK_PRIORITY
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
