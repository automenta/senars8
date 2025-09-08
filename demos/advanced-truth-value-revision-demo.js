const System = require('../src/system/System');
const {createTask} = require('./demo-utils');
const TruthValueManager = require('../src/reasoner/TruthValueManager');
const MetaCognition = require('../src/system/MetaCognition');

/**
 * Advanced Truth Value Revision Demo
 * Demonstrates the system's advanced truth value revision capabilities.
 */
async function advancedTruthValueRevisionDemo() {
    console.log("=== Advanced Truth Value Revision Demo ===\n");

    const system = new System();
    await system.initialize();

    // Initialize TruthValueManager and MetaCognition for direct testing
    const truthValueManager = new TruthValueManager();
    const metaCognition = new MetaCognition();

    // Add knowledge with varying truth values
    const taskDefs = [
        // High confidence beliefs
        {termKey: '(birds_can_fly)', punctuation: '.', truthValue: {frequency: 0.95, confidence: 0.95}},
        {termKey: '(penguins_are_birds)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.95}},
        {termKey: '(penguins_can_fly)', punctuation: '.', truthValue: {frequency: 0.1, confidence: 0.9}},

        // Medium confidence beliefs
        {termKey: '(all_birds_can_fly)', punctuation: '.', truthValue: {frequency: 0.8, confidence: 0.7}},
        {termKey: '(some_birds_cannot_fly)', punctuation: '.', truthValue: {frequency: 0.9, confidence: 0.65}},

        // Low confidence beliefs
        {termKey: '(ostriches_can_fly)', punctuation: '.', truthValue: {frequency: 0.2, confidence: 0.3}},

        // Questions to trigger inference
        {termKey: '(can_all_birds_fly)', punctuation: '?', truthValue: {frequency: 1.0, confidence: 0.8}},

        // Goals for revision
        {termKey: 'resolve_bird_flying_contradictions', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.9}}
    ];

    // Create tasks and filter out any that failed to parse
    const tasks = taskDefs.map(def => createTask(def.termKey, def.punctuation, def.truthValue, def.stamp)).filter(Boolean);

    if (tasks.length === 0) {
        console.log("No valid tasks could be created. Exiting demo.");
        return;
    }

    await system.addTasks(tasks);

    console.log("Running 4 cognitive cycles to demonstrate advanced truth value revision...\n");

    for (let i = 0; i < 4; i++) {
        const result = await system.runCycle();
        console.log(`Cycle ${i + 1}:`);
        console.log(`  - Derived Tasks: ${result.derivedTasks}`);
        console.log(`  - Contradictions: ${result.contradictions}`);
        console.log(`  - Meta Tasks: ${result.metaTasks}`);
        console.log();
    }

    // Direct TruthValueManager testing
    console.log("\n=== Direct TruthValueManager Testing ===");

    // Test Bayesian revision
    console.log("\n1. Bayesian revision:");
    try {
        const testTask = createTask('(test_belief)', '.', {frequency: 0.7, confidence: 0.6});
        if (testTask) {
            console.log(`  Before revision: freq=${testTask.state.truthValue.frequency.toFixed(2)}, conf=${testTask.state.truthValue.confidence.toFixed(2)}`);

            truthValueManager.bayesianRevision(testTask, {frequency: 0.9, confidence: 0.8}, 0.7);
            console.log(`  After revision: freq=${testTask.state.truthValue.frequency.toFixed(2)}, conf=${testTask.state.truthValue.confidence.toFixed(2)}`);
        }
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test consensus revision
    console.log("\n2. Consensus revision:");
    try {
        const testTask = createTask('(consensus_test)', '.', {frequency: 0.5, confidence: 0.5});
        if (testTask) {
            console.log(`  Before revision: freq=${testTask.state.truthValue.frequency.toFixed(2)}, conf=${testTask.state.truthValue.confidence.toFixed(2)}`);

            const evidenceSources = [
                {frequency: 0.8, confidence: 0.9},
                {frequency: 0.7, confidence: 0.8},
                {frequency: 0.9, confidence: 0.7}
            ];

            truthValueManager.consensusRevision(testTask, evidenceSources);
            console.log(`  After revision: freq=${testTask.state.truthValue.frequency.toFixed(2)}, conf=${testTask.state.truthValue.confidence.toFixed(2)}`);
        }
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test temporal decay revision
    console.log("\n3. Temporal decay revision:");
    try {
        const oldStamp = {creationTime: Date.now() - 86400000}; // 24 hours ago
        const testTask = createTask('(temporal_test)', '.', {frequency: 0.9, confidence: 0.9}, oldStamp);
        if (testTask) {
            console.log(`  Before decay: freq=${testTask.state.truthValue.frequency.toFixed(2)}, conf=${testTask.state.truthValue.confidence.toFixed(2)}`);

            truthValueManager.temporalDecayRevision(testTask, Date.now(), 0.0002);
            console.log(`  After decay: freq=${testTask.state.truthValue.frequency.toFixed(2)}, conf=${testTask.state.truthValue.confidence.toFixed(2)}`);
        }
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test conflict resolution
    console.log("\n4. Conflict resolution:");
    try {
        const conflictingTask1 = createTask('(conflict_test)', '.', {frequency: 0.9, confidence: 0.8});
        const conflictingTask2 = createTask('(conflict_test)', '.', {frequency: 0.2, confidence: 0.7});

        if (conflictingTask1 && conflictingTask2) {
            console.log(`  Task 1 before: freq=${conflictingTask1.state.truthValue.frequency.toFixed(2)}, conf=${conflictingTask1.state.truthValue.confidence.toFixed(2)}`);
            console.log(`  Task 2 before: freq=${conflictingTask2.state.truthValue.frequency.toFixed(2)}, conf=${conflictingTask2.state.truthValue.confidence.toFixed(2)}`);

            truthValueManager.resolveConflict(conflictingTask1, conflictingTask2);
            console.log(`  Task 1 after: freq=${conflictingTask1.state.truthValue.frequency.toFixed(2)}, conf=${conflictingTask1.state.truthValue.confidence.toFixed(2)}`);
            console.log(`  Task 2 after: freq=${conflictingTask2.state.truthValue.frequency.toFixed(2)}, conf=${conflictingTask2.state.truthValue.confidence.toFixed(2)}`);
        }
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test reinforcement update
    console.log("\n5. Reinforcement update:");
    try {
        const testTask = createTask('(reinforcement_test)', '.', {frequency: 0.6, confidence: 0.5});
        if (testTask) {
            console.log(`  Before update: freq=${testTask.state.truthValue.frequency.toFixed(2)}, conf=${testTask.state.truthValue.confidence.toFixed(2)}`);

            truthValueManager.reinforcementUpdate(testTask, 0.8, 0.2);
            console.log(`  After update: freq=${testTask.state.truthValue.frequency.toFixed(2)}, conf=${testTask.state.truthValue.confidence.toFixed(2)}`);
        }
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test sophisticated revision
    console.log("\n6. Sophisticated revision:");
    try {
        const testTask = createTask('(sophisticated_test)', '.', {frequency: 0.7, confidence: 0.6});
        if (testTask) {
            console.log(`  Before revision: freq=${testTask.state.truthValue.frequency.toFixed(2)}, conf=${testTask.state.truthValue.confidence.toFixed(2)}`);

            truthValueManager.sophisticatedRevision(testTask, {
                newEvidence: {frequency: 0.9, confidence: 0.8},
                evidenceWeight: 0.6,
                applyTemporalDecay: true,
                decayRate: 0.0001,
                reward: 0.5,
                learningRate: 0.1
            });
            console.log(`  After revision: freq=${testTask.state.truthValue.frequency.toFixed(2)}, conf=${testTask.state.truthValue.confidence.toFixed(2)}`);
        }
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Direct MetaCognition testing with truth value revision strategy
    console.log("\n7. MetaCognition with truth value revision:");
    try {
        const contradiction = {
            type: 'frequency_conflict',
            tasks: [
                createTask('(conflict_a)', '.', {frequency: 0.9, confidence: 0.9}),
                createTask('(conflict_a)', '.', {frequency: 0.1, confidence: 0.85})
            ].filter(Boolean),
            confidence: 0.9,
            severity: 0.85,
            details: 'High confidence frequency conflict'
        };

        if (contradiction.tasks.length === 2) {
            const resolutionTasks = metaCognition.resolve(contradiction, 'truth_value_revision');
            console.log(`  Generated ${resolutionTasks.length} resolution tasks using truth value revision`);
        }
    } catch (error) {
        console.log("  Error:", error.message);
    }

    console.log("\n=== Demo Complete ===");
}

module.exports = advancedTruthValueRevisionDemo;

if (require.main === module) {
    advancedTruthValueRevisionDemo().catch(console.error);
}