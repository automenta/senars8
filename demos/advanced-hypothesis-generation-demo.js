const System = require('../src/system/System');
const {createTask} = require('./demo-utils');

/**
 * Advanced Hypothesis Generation Demo
 *
 * This demo showcases the system's ability to generate creative and
 * sophisticated hypotheses using its langchain-powered LM module.
 */
async function advancedHypothesisGenerationDemo() {
    console.log("=== Advanced Hypothesis Generation Demo ===\n");

    const system = new System();
    await system.initialize();

    console.log("1. Providing the system with initial observations...\n");

    const observations = [
        createTask('(cat --> chase_mouse).', '.', {frequency: 0.9, confidence: 0.9}),
        createTask('(dog --> chase_cat).', '.', {frequency: 0.8, confidence: 0.8}),
        createTask('(hawk --> chase_mouse).', '.', {frequency: 0.7, confidence: 0.7}),
    ].filter(Boolean);

    await system.addTasks(observations);
    console.log("Initial observations added to memory:");
    observations.forEach(task => console.log(`  - ${task.termKey}${task.punctuation}`));

    console.log("\n2. Asking the LM to generate creative hypotheses...\n");

    const creativeHypotheses = await system.lm.generateHypotheses(observations, {
        type: 'creative',
        num: 2,
    });

    console.log("Creative hypotheses generated:");
    if (creativeHypotheses.length > 0) {
        creativeHypotheses.forEach((task, i) => {
            console.log(`  - Hypothesis ${i + 1}: ${task.termKey}${task.punctuation}`);
            console.log(`    Truth Value: { freq: ${task.state.truthValue.frequency.toFixed(2)}, conf: ${task.state.truthValue.confidence.toFixed(2)} }`);
        });
    } else {
        console.log("  No creative hypotheses were generated.");
    }

    console.log("\n3. Asking the LM to generate and refine sophisticated hypotheses...\n");

    const sophisticatedHypotheses = await system.lm.generateHypotheses(observations, {
        type: 'sophisticated',
        num: 1,
        refinement: 'make_testable'
    });

    console.log("Refined, sophisticated hypotheses generated:");
    if (sophisticatedHypotheses.length > 0) {
        sophisticatedHypotheses.forEach((task, i) => {
            console.log(`  - Hypothesis ${i + 1}: ${task.termKey}${task.punctuation}`);
            console.log(`    Truth Value: { freq: ${task.state.truthValue.frequency.toFixed(2)}, conf: ${task.state.truthValue.confidence.toFixed(2)} }`);
        });
    } else {
        console.log("  No sophisticated hypotheses were generated.");
    }


    console.log("\n=== Demo Complete ===");
}

module.exports = advancedHypothesisGenerationDemo;

if (require.main === module) {
    advancedHypothesisGenerationDemo().catch(console.error);
}
