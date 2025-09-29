import { createSystem } from '../../core/index.js';
import { info, error } from '../../core/utils/logger.js';
import { strict as assert } from 'node:assert';
import Task from '../../core/core/Task.js';
import { parseTerm } from '../../core/parser/parse-utils.js';

/**
 * This demo showcases SeNARS's ability to learn new multi-step procedures
 * by observing the results of its actions.
 */
async function proceduralLearningDemo() {
    info('--- Starting Procedural Learning Demo ---');

    // 1. Create a SeNARS system and get its core components
    const system = await createSystem({
        // Config overrides can be placed here if needed
    });
    const { tools, memory, eventBus } = system;

    // 2. Define and register primitive tools
    // Tool A: Creates a resource. Its execution results in a belief that the resource exists.
    tools.register({
        id: 'creator',
        operator: '^create',
        description: 'Creates a resource.',
        handler: async () => {
            info('DEMO: Executed ^create');
            return { entity: 'resource', status: 'exists' };
        },
        outputSchema: {
            properties: { status: { mapsTo: 'state' } },
        },
    });

    // Tool B: Processes the resource. This implicitly requires the resource to exist.
    tools.register({
        id: 'processor',
        operator: '^process',
        description: 'Processes a resource.',
        handler: async () => {
            info('DEMO: Executed ^process');
            return { entity: 'resource', status: 'processed' };
        },
        outputSchema: {
            properties: { status: { mapsTo: 'state' } },
        },
    });

    // 3. Provide background knowledge
    // This knowledge connects the tools to their outcomes and establishes the precondition.
    const backgroundKnowledge = [
        '<<(^create) ==> <resource --> state>>. %1.0;0.9%',     // Doing ^create affects the resource's state.
        '<<(^process) ==> <resource --> state>>. %1.0;0.9%',    // Doing ^process affects the resource's state.
        '<<(*, resource, state) --> processed> ==> <(*, resource, state) --> exists>>. %1.0;0.9%', // A processed resource must first exist.
    ];
    await system.addTasks(backgroundKnowledge);
    info('DEMO: Added background knowledge.');

    // 4. Set a high-level goal, with high priority
    const goalTerm = parseTerm('<(*, resource, state) --> processed>');
    const goalTask = new Task(
        goalTerm,
        '!', // Punctuation for Goal
        { frequency: 1.0, confidence: 0.9 }, // Truth value
        null, // Stamp
        { priority: 0.99 } // High priority state
    );
    await system.addTasks(goalTask);
    info(`DEMO: Set goal: ${goalTask.termKey}! with priority 0.99`);

    // 5. Run the system for enough cycles to find and execute a plan, and then learn from it.
    info('DEMO: Running system for 15 cycles...');
    for (let i = 0; i < 15; i++) {
        await system.runCycle();
    }

    // 6. Verify that the system has learned the procedural rule
    info('DEMO: Verifying learned knowledge...');
    const learnedImplications = memory.getAllTasks().filter(task =>
        task.term.type === 'Implication' &&
        task.term.subject.type === 'Operation' &&
        task.term.predicate.type === 'Operation'
    );

    const expectedImplicationKey = '<(^create) ==> (^process)>';
    const foundLearnedRule = learnedImplications.some(task => task.termKey === expectedImplicationKey);

    assert(foundLearnedRule, `FAILURE: System did not learn the expected procedural rule: ${expectedImplicationKey}`);

    if (foundLearnedRule) {
        info(`SUCCESS: System learned the procedural rule "${expectedImplicationKey}" from experience.`);
    } else {
        info('FAILURE: Expected implication not found. Learned implications:');
        learnedImplications.forEach(t => info(`- ${t.termKey} | c: ${t.state.truthValue.confidence.toFixed(2)}`));
    }

    info('--- Procedural Learning Demo Finished ---');

    // Stop the system to allow the process to exit cleanly
    system.stop();

    return foundLearnedRule;
}

// Run the demo
proceduralLearningDemo().catch(err => {
    error('Demo failed with an exception:', err);
    process.exit(1);
});