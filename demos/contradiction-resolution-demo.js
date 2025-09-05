const System = require('../src/system/System');
const { createTask } = require('./demo-utils');

/**
 * Contradiction Resolution Demo
 * Demonstrates the system's meta-cognitive capabilities for detecting and resolving contradictions.
 */
async function contradictionResolutionDemo() {
    console.log("=== Contradiction Resolution Demo ===\n");

    const system = new System();
    await system.initialize();

    // Add contradictory knowledge
    const taskDefs = [
        // High confidence belief that birds can fly
        {termKey: '(bird --> can_fly)', punctuation: '.', truthValue: {frequency: 0.95, confidence: 0.95}},
        // High confidence belief that penguins are birds
        {termKey: '(penguin --> bird)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.95}},
        // High confidence belief that penguins cannot fly
        {termKey: '(penguin --> (--, can_fly))', punctuation: '.', truthValue: {frequency: 0.95, confidence: 0.95}},
        // Question about penguins flying
        {termKey: '(penguin --> can_fly)', punctuation: '?', truthValue: {frequency: 1.0, confidence: 0.8}},
        // Goal to resolve contradiction
        {termKey: 'resolve_bird_flying_contradiction', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.9}}
    ];

    // Create tasks and filter out any that failed to parse
    const tasks = taskDefs.map(def => createTask(def.termKey, def.punctuation, def.truthValue, def.stamp)).filter(Boolean);

    if (tasks.length === 0) {
        console.log("No valid tasks could be created. Exiting demo.");
        return;
    }

    await system.addTasks(tasks);

    console.log("Running 6 cognitive cycles to demonstrate contradiction resolution...\n");

    for (let i = 0; i < 6; i++) {
        const result = await system.runCycle();
        console.log(`Cycle ${i + 1}:`);
        console.log(`  - Derived Tasks: ${result.derivedTasks}`);
        console.log(`  - Contradictions: ${result.contradictions}`);
        console.log(`  - Meta Tasks: ${result.metaTasks}`);
        console.log();
    }

    console.log("\n=== Demo Complete ===");
}

module.exports = contradictionResolutionDemo;

if (require.main === module) {
    contradictionResolutionDemo().catch(console.error);
}