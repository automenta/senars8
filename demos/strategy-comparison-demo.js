const Reasoner = require('../src/reasoner/Reasoner');
const BruteForceStrategy = require('../src/reasoner/strategies/BruteForceStrategy');
const BagSamplingStrategy = require('../src/reasoner/strategies/BagSamplingStrategy');
const {createTask} = require('./demo-utils');
const rules = require('../src/reasoner/rules');

/**
 * Strategy Comparison Demo
 *
 * This demo showcases the difference between the BruteForceStrategy and the BagSamplingStrategy.
 *
 * - BruteForceStrategy: Considers all possible combinations of tasks.
 * - BagSamplingStrategy: Samples tasks based on their priority, making it more likely
 *   to select high-priority tasks for reasoning.
 *
 * The demo will create a set of tasks with varying priorities and show which combinations
 * each strategy chooses to form premises for inference rules.
 */
function strategyComparisonDemo() {
    console.log("=== Strategy Comparison Demo ===\n");

    // 1. Create a set of tasks with a wide range of priorities
    const taskDefs = [
        {name: "High_Priority_1", priority: 0.99},
        {name: "High_Priority_2", priority: 0.98},
        {name: "High_Priority_3", priority: 0.97},
        {name: "Medium_Priority_1", priority: 0.5},
        {name: "Medium_Priority_2", priority: 0.4},
        {name: "Low_Priority_1", priority: 0.1},
        {name: "Low_Priority_2", priority: 0.05},
        {name: "Low_Priority_3", priority: 0.01},
    ];

    const focusSet = taskDefs.map((def, i) => {
        // We use a simple term structure for clarity
        const task = createTask(`(task${i} --> ${def.name})`, '.', {frequency: 1.0, confidence: def.priority});
        // Manually set the priority on the task's state for this demo
        task.state.priority = def.priority;
        return task;
    });

    console.log("Focus Set of Tasks (with priorities):");
    focusSet.forEach(t => console.log(`- ${t.term.key}: ${t.state.priority.toFixed(2)}`));
    console.log("\n");


    // For this demo, we only care about which premises are selected, not the inference result.
    // We'll use a dummy rule that just returns the selected tasks.
    const dummyRule = {
        name: 'DummyPairRule',
        arity: 2,
        operands: [() => true, () => true], // Accepts any task
        action: (task1, task2) => {
            // The "derived task" is just an array of the premises for logging purposes.
            return [task1, task2];
        },
        condition: () => true, // Always applies
    };

    // To isolate the test, we'll temporarily replace the system's rules with our dummy rule.
    const originalRules = [...rules];
    rules.length = 0;
    rules.push(dummyRule);


    // 2. Instantiate Reasoners with different strategies
    const bruteForceReasoner = new Reasoner(new BruteForceStrategy());
    const bagSamplingReasoner = new Reasoner(new BagSamplingStrategy());

    // 3. Perform inference and log the results
    console.log("--- BruteForceStrategy ---");
    console.log("Selects all possible pairs, regardless of priority.");
    const bruteForceResults = bruteForceReasoner.performInference(focusSet);
    bruteForceResults.forEach(res => {
        console.log(`- Selected: [${res[0].term.key}, ${res[1].term.key}]`);
    });
    console.log(`Total combinations found: ${bruteForceResults.length}\n`);


    console.log("--- BagSamplingStrategy ---");
    console.log("Should preferentially select high-priority tasks.");
    const bagSamplingResults = bagSamplingReasoner.performInference(focusSet);
    bagSamplingResults.forEach(res => {
        const p1 = res[0].state.priority.toFixed(2);
        const p2 = res[1].state.priority.toFixed(2);
        console.log(`- Selected: [${res[0].term.key} (p=${p1}), ${res[1].term.key} (p=${p2})]`);
    });
    console.log(`Total combinations found: ${bagSamplingResults.length}\n`);

    // Restore original rules to not affect other demos
    rules.length = 0;
    rules.push(...originalRules);


    console.log("=== Demo Complete ===");
}

module.exports = strategyComparisonDemo;

// This allows the demo to be run directly from the command line
if (require.main === module) {
    strategyComparisonDemo();
}
