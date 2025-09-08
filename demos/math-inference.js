const System = require('../src/system/System');
const {createTask} = require('./demo-utils');

/**
 * Math Inference Demo
 * Demonstrates the system's ability to perform logical inference with mathematical relationships.
 */
async function mathInferenceDemo() {
    console.log("=== Math Inference Demo ===\n");

    const system = new System();
    await system.initialize();

    // Add initial mathematical knowledge
    const taskDefs = [
        // Axiom: All numbers are either even or odd
        {termKey: '(number --> (||, even, odd))', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.9}},
        // Fact: 2 is a number
        {termKey: '(2 --> number)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.95}},
        // Fact: 2 is even
        {termKey: '(2 --> even)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.95}},
        // Rule: Even numbers are divisible by 2
        {
            termKey: '((number --> even) ==> (number --> divisible_by_2))',
            punctuation: '.',
            truthValue: {frequency: 0.9, confidence: 0.9}
        },
        // Goal: Understand properties of 2
        {termKey: '(2 --> divisible_by_2)', punctuation: '?', truthValue: {frequency: 1.0, confidence: 0.8}}
    ];

    // Create tasks and filter out any that failed to parse
    const tasks = taskDefs.map(def => createTask(def.termKey, def.punctuation, def.truthValue)).filter(Boolean);

    if (tasks.length === 0) {
        console.log("No valid tasks could be created. Exiting demo.");
        return;
    }

    await system.addTasks(tasks);

    console.log("Running 3 cognitive cycles to demonstrate inference...\n");

    for (let i = 0; i < 3; i++) {
        await system.runCycle();
    }

    console.log("\n=== Demo Complete ===");
}

module.exports = mathInferenceDemo;

if (require.main === module) {
    mathInferenceDemo().catch(console.error);
}