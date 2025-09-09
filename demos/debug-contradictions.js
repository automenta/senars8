const MetaCognition = require('../src/system/MetaCognition');
const {createTask} = require('../shared/demo-utils');

async function debugContradictions() {
    console.log("=== Debugging Contradiction Detection ===\n");

    const metaCognition = new MetaCognition();

    // Create tasks with contradictions
    const taskDefs = [
        // High confidence belief that birds can fly
        {termKey: '(bird --> can_fly)', punctuation: '.', truthValue: {frequency: 0.95, confidence: 0.95}},
        // High confidence belief that penguins are birds
        {termKey: '(penguin --> bird)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.95}},
        // High confidence belief that penguins cannot fly
        {termKey: '(penguin --> (--, can_fly))', punctuation: '.', truthValue: {frequency: 0.95, confidence: 0.95}}
    ];

    // Create tasks
    const tasks = taskDefs.map(def => createTask(def.termKey, def.punctuation, def.truthValue)).filter(Boolean);

    // Find contradictions
    console.log("Finding contradictions...\n");
    const contradictions = metaCognition.findContradictions(tasks);

    console.log(`Found ${contradictions.length} contradictions:`);
    for (let i = 0; i < contradictions.length; i++) {
        const contradiction = contradictions[i];
        console.log(`${i + 1}. Type: ${contradiction.type}`);
        console.log(`   Confidence: ${contradiction.confidence.toFixed(3)}`);
        console.log(`   Severity: ${(contradiction.severity || 0).toFixed(3)}`);
        console.log(`   Details: ${contradiction.details}`);
        console.log(`   Tasks:`);
        for (const task of contradiction.tasks) {
            console.log(`     - ${task.termKey}${task.punctuation} (freq: ${task.state.truthValue.frequency.toFixed(3)}, conf: ${task.state.truthValue.confidence.toFixed(3)})`);
        }
        console.log();
    }

    // Try to resolve contradictions
    if (contradictions.length > 0) {
        console.log("Resolving contradictions...\n");
        for (const contradiction of contradictions) {
            const resolutionTasks = metaCognition.resolve(contradiction, 'revision');
            console.log(`Resolution for ${contradiction.type}:`);
            console.log(`  Generated ${resolutionTasks.length} meta-tasks:`);
            for (const task of resolutionTasks) {
                console.log(`    - ${task.termKey}${task.punctuation} (freq: ${task.state.truthValue.frequency.toFixed(3)}, conf: ${task.state.truthValue.confidence.toFixed(3)})`);
            }
            console.log();
        }
    }

    console.log("=== Debug Complete ===");
}

debugContradictions().catch(console.error);