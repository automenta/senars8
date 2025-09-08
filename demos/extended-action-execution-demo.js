const System = require('../src/system/System');
const {createTask} = require('./demo-utils');

/**
 * Extended Action Execution Demo
 * Demonstrates the system's extended action execution capabilities.
 */
async function extendedActionExecutionDemo() {
    console.log("=== Extended Action Execution Demo ===\n");

    const system = new System();
    await system.initialize();

    // Add goals that demonstrate different action types
    const taskDefs = [
        // Simple atomic goal
        {termKey: 'print_hello_world', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.9}},

        // Compound action goal
        {termKey: '(&, create, file, test.txt)', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.9}},

        // Sequential actions
        {
            termKey: '(&/, analyze, plan, execute_solution)',
            punctuation: '!',
            truthValue: {frequency: 1.0, confidence: 0.9}
        },

        // Parallel actions
        {termKey: '(||, log_activity, update_status)', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.9}},

        // Choice actions
        {
            termKey: '(|, navigate_to_kitchen, navigate_to_living_room)',
            punctuation: '!',
            truthValue: {frequency: 1.0, confidence: 0.9}
        },

        // Conditional action
        {
            termKey: '((environment_is_safe) ==> (proceed_with_task))',
            punctuation: '!',
            truthValue: {frequency: 1.0, confidence: 0.9}
        },

        // Complex goal
        {termKey: '(&, achieve, system_optimization)', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.9}},

        // Temporal action
        {
            termKey: '(&, future, send_report, tomorrow)',
            punctuation: '!',
            truthValue: {frequency: 1.0, confidence: 0.9}
        },

        // Resource-aware action
        {termKey: '(&, optimize, cpu_usage)', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.9}},

        // Constraint-aware action
        {termKey: '(&, coordinate, team_members)', punctuation: '!', truthValue: {frequency: 1.0, confidence: 0.9}}
    ];

    // Create tasks and filter out any that failed to parse
    const tasks = taskDefs.map(def => createTask(def.termKey, def.punctuation, def.truthValue)).filter(Boolean);

    if (tasks.length === 0) {
        console.log("No valid tasks could be created. Exiting demo.");
        return;
    }

    await system.addTasks(tasks);

    console.log("Running 5 cognitive cycles to demonstrate extended action execution...\n");

    for (let i = 0; i < 5; i++) {
        const result = await system.runCycle();
        console.log(`Cycle ${i + 1}:`);
        console.log(`  - Derived Tasks: ${result.derivedTasks}`);
        console.log(`  - Contradictions: ${result.contradictions}`);
        console.log(`  - Meta Tasks: ${result.metaTasks}`);
        console.log(`  - Execution Results: ${result.executionResults ? result.executionResults.length : 0}`);
        console.log();
    }

    console.log("\n=== Demo Complete ===");
}

module.exports = extendedActionExecutionDemo;

if (require.main === module) {
    extendedActionExecutionDemo().catch(console.error);
}