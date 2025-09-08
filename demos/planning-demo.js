const System = require('../src/system/System');
const {createTask} = require('./demo-utils');

/**
 * Planning Demo
 * Demonstrates the system's goal-directed behavior and planning capabilities,
 * showcasing the ability to switch between different planning strategies.
 */
async function planningDemo() {
    console.log("=== Planning Demo ===\n");

    const taskDefs = [
        {
            termKey: '((&&, make_coffee, water) ==> coffee_made)',
            punctuation: '.',
            truthValue: {frequency: 0.9, confidence: 0.9}
        },
        {
            termKey: '((&&, make_coffee, coffee_beans) ==> coffee_made)',
            punctuation: '.',
            truthValue: {frequency: 0.9, confidence: 0.9}
        },
        {termKey: '(tap --> water_source)', punctuation: '.', truthValue: {frequency: 1.0, confidence: 0.95}},
        {termKey: '(buy --> obtain_coffee_beans)', punctuation: '.', truthValue: {frequency: 0.8, confidence: 0.9}},
        {termKey: 'make_coffee', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.9}},
        {termKey: 'obtain_water', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.8}}
    ];

    const tasks = taskDefs.map(def => createTask(def.termKey, def.punctuation, def.truthValue, def.stamp)).filter(Boolean);

    if (tasks.length === 0) {
        console.log("No valid tasks could be created. Exiting demo.");
        return;
    }

    // --- Run with default HTN Planner ---
    console.log("--- Running with Default Planner (HTN) ---");
    const systemHTN = new System(); // Uses default config
    await systemHTN.initialize();
    await systemHTN.addTasks(tasks);

    console.log("Running 5 cognitive cycles...\n");
    for (let i = 0; i < 5; i++) {
        const result = await systemHTN.runCycle();
        console.log(`Cycle ${i + 1} execution results:`, result.executionResults);
    }
    console.log("\n--- HTN Planner Run Complete ---\n");


    // --- Run with AStar Planner ---
    console.log("--- Running with AStar Planner ---");
    const aStarConfig = {
        planner: {
            strategy: 'AStar'
        }
    };
    const systemAStar = new System(aStarConfig);
    await systemAStar.initialize();
    await systemAStar.addTasks(tasks);

    console.log("Running 5 cognitive cycles...\n");
    for (let i = 0; i < 5; i++) {
        const result = await systemAStar.runCycle();
        console.log(`Cycle ${i + 1} execution results:`, result.executionResults);
    }
    console.log("\n--- AStar Planner Run Complete ---\n");


    console.log("\n=== Demo Complete ===");
}

module.exports = planningDemo;

if (require.main === module) {
    planningDemo().catch(console.error);
}