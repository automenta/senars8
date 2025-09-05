const System = require('../src/system/System');
const Task = require('../src/core/Task');
const {parseTerm} = require('../src/parser/NewParser');

/**
 * Extended Inference Rules Demo
 * Demonstrates the system's extended inference capabilities.
 */
async function extendedInferenceRulesDemo() {
    console.log("=== Extended Inference Rules Demo ===\n");

    const system = new System();
    await system.initialize();

    // Helper function to create a task
    function createTask(termKey, punctuation, truthValue) {
        const parsedTerm = parseTerm(termKey);
        if (!parsedTerm) {
            console.warn(`Failed to parse term: ${termKey}`);
            return null;
        }
        return new Task(parsedTerm, punctuation, truthValue);
    }

    // Add knowledge that will trigger the new inference rules
    const taskDefs = [
        // Basic inheritance relationships
        {termKey: '(bird --> animal)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.9}},
        {termKey: '(animal --> living_thing)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.95}},
        {termKey: '(robin --> bird)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.9}},
        {termKey: '(penguin --> bird)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.9}},
        {termKey: '(penguin --> swimmer)', punctuation: '.', truthValue: {frequency: 0.9, confidence: 0.85}},
        {termKey: '(fish --> swimmer)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.9}},
        {termKey: '(mammal --> animal)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.95}},
        {termKey: '(dog --> mammal)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.9}},

        // Questions to trigger inference
        {termKey: '(robin --> living_thing)', punctuation: '?', truthValue: {frequency: 1.0, confidence: 0.8}},
        {termKey: '(dog --> living_thing)', punctuation: '?', truthValue: {frequency: 1.0, confidence: 0.8}},
        {termKey: '(penguin --> animal)', punctuation: '?', truthValue: {frequency: 1.0, confidence: 0.8}},
        {termKey: '(&, bird, swimmer)', punctuation: '?', truthValue: {frequency: 1.0, confidence: 0.8}},
        {termKey: '(swimmer --> animal)', punctuation: '?', truthValue: {frequency: 1.0, confidence: 0.8}},
        {termKey: '((--,animal) --> (--,bird))', punctuation: '?', truthValue: {frequency: 1.0, confidence: 0.8}},

        // Goals to trigger inference
        {termKey: 'derive_all_relationships', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.9}}
    ];

    // Create tasks and filter out any that failed to parse
    const tasks = taskDefs.map(def => createTask(def.termKey, def.punctuation, def.truthValue)).filter(Boolean);

    if (tasks.length === 0) {
        console.log("No valid tasks could be created. Exiting demo.");
        return;
    }

    await system.addTasks(tasks);

    console.log("Running 5 cognitive cycles to demonstrate extended inference rules...\n");

    for (let i = 0; i < 5; i++) {
        const result = await system.runCycle();
        console.log(`Cycle ${i + 1}:`);
        console.log(`  - Derived Tasks: ${result.derivedTasks}`);
        console.log(`  - Contradictions: ${result.contradictions}`);
        console.log(`  - Meta Tasks: ${result.metaTasks}`);
        console.log();
    }

    // Show some of the derived tasks
    console.log("\n=== Sample Derived Tasks ===");
    const allTasks = system.memory.getAllTasks();
    const derivedTasks = allTasks.filter(task => task.punctuation === '.');

    console.log(`Total tasks in memory: ${allTasks.length}`);
    console.log(`Derived belief tasks: ${derivedTasks.length}`);

    // Show some interesting derived tasks
    const interestingTasks = derivedTasks.slice(-5); // Get last 5 tasks
    for (const task of interestingTasks) {
        console.log(`  - ${task.termKey} (freq: ${task.state.truthValue.frequency.toFixed(2)}, conf: ${task.state.truthValue.confidence.toFixed(2)})`);
    }

    console.log("\n=== Demo Complete ===");
}

module.exports = extendedInferenceRulesDemo;

if (require.main === module) {
    extendedInferenceRulesDemo().catch(console.error);
}