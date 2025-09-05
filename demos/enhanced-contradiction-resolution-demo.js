const System = require('../src/system/System');
const { createTask } = require('./demo-utils');
const MetaCognition = require('../src/system/MetaCognition');

/**
 * Enhanced Contradiction Resolution Demo
 * Demonstrates the system's enhanced contradiction resolution strategies.
 */
async function enhancedContradictionResolutionDemo() {
    console.log("=== Enhanced Contradiction Resolution Demo ===\n");

    const system = new System();
    await system.initialize();

    // Initialize MetaCognition for direct testing
    const metaCognition = new MetaCognition();

    // Add knowledge with various types of contradictions
    const taskDefs = [
        // Direct negation contradiction
        {termKey: '(bird --> can_fly)', punctuation: '.', truthValue: {frequency: 0.95, confidence: 0.9}},
        {termKey: '(bird --> (--, can_fly))', punctuation: '.', truthValue: {frequency: 0.85, confidence: 0.85}},

        // Inheritance contradiction
        {termKey: '(penguin --> bird)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.95}},
        {termKey: '(penguin --> can_fly)', punctuation: '.', truthValue: {frequency: 0.2, confidence: 0.9}},
        {termKey: '(penguin --> (--, can_fly))', punctuation: '.', truthValue: {frequency: 0.95, confidence: 0.95}},

        // Temporal contradiction
        {
            termKey: '(meeting_attendance)', punctuation: '.', truthValue: {frequency: 0.9, confidence: 0.85},
            stamp: {creationTime: Date.now(), occurrenceTime: Date.now() - 3600000}
        }, // 1 hour ago
        {
            termKey: '(meeting_attendance)', punctuation: '.', truthValue: {frequency: 0.3, confidence: 0.8},
            stamp: {creationTime: Date.now(), occurrenceTime: Date.now() - 1800000}
        }, // 30 minutes ago

        // Frequency conflict
        {termKey: '(project_completion)', punctuation: '.', truthValue: {frequency: 0.9, confidence: 0.9}},
        {termKey: '(project_completion)', punctuation: '.', truthValue: {frequency: 0.1, confidence: 0.85}},

        // Goal to resolve contradictions
        {termKey: 'resolve_all_contradictions', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.9}}
    ];

    // Create tasks and filter out any that failed to parse
    const tasks = taskDefs.map(def =>
        createTask(def.termKey, def.punctuation, def.truthValue, def.stamp)
    ).filter(Boolean);

    if (tasks.length === 0) {
        console.log("No valid tasks could be created. Exiting demo.");
        return;
    }

    await system.addTasks(tasks);

    console.log("Running 5 cognitive cycles to demonstrate enhanced contradiction resolution...\n");

    for (let i = 0; i < 5; i++) {
        const result = await system.runCycle();
        console.log(`Cycle ${i + 1}:`);
        console.log(`  - Derived Tasks: ${result.derivedTasks}`);
        console.log(`  - Contradictions: ${result.contradictions}`);
        console.log(`  - Meta Tasks: ${result.metaTasks}`);
        console.log();
    }

    // Direct MetaCognition testing
    console.log("\n=== Direct MetaCognition Testing ===");

    // Test contradiction detection
    console.log("\n1. Contradiction detection:");
    try {
        const contradictions = metaCognition.findContradictions(tasks);
        console.log(`  Found ${contradictions.length} contradictions:`);
        contradictions.forEach((contradiction, index) => {
            console.log(`    ${index + 1}. Type: ${contradiction.type}`);
            console.log(`       Severity: ${contradiction.severity.toFixed(3)}`);
            console.log(`       Details: ${contradiction.details}`);
        });
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test auto strategy selection
    console.log("\n2. Auto strategy selection:");
    try {
        const contradictions = metaCognition.findContradictions(tasks);
        if (contradictions.length > 0) {
            const sampleContradiction = contradictions[0];
            const strategy = metaCognition._selectOptimalResolutionStrategy(sampleContradiction);
            console.log(`  For contradiction type '${sampleContradiction.type}' with severity ${sampleContradiction.severity.toFixed(3)}:`);
            console.log(`  Recommended strategy: ${strategy}`);
        }
    } catch (error) {
        console.log("  Error:", error.message);
    }

    // Test different resolution strategies
    console.log("\n3. Different resolution strategies:");
    try {
        const contradictions = metaCognition.findContradictions(tasks);
        if (contradictions.length > 0) {
            const sampleContradiction = contradictions[Math.min(1, contradictions.length - 1)]; // Get a different contradiction

            const strategies = ['revision', 'reconciliation', 'temporal_analysis', 'contextual_reconciliation'];
            for (const strategy of strategies) {
                const resolutionTasks = metaCognition.resolve(sampleContradiction, strategy);
                console.log(`  Strategy '${strategy}' generated ${resolutionTasks.length} tasks`);
            }
        }
    } catch (error) {
        console.log("  Error:", error.message);
    }

    console.log("\n=== Demo Complete ===");
}

module.exports = enhancedContradictionResolutionDemo;

if (require.main === module) {
    enhancedContradictionResolutionDemo().catch(console.error);
}