const System = require('../src/system/System');
const Task = require('../src/core/Task');
const { parseTerm } = require('../src/parser/NewParser');

/**
 * Planning Demo
 * Demonstrates the system's goal-directed behavior and planning capabilities.
 */
async function planningDemo() {
    console.log("=== Planning Demo ===\n");

    const system = new System();
    await system.initialize();

    // Helper function to create a task with error handling
    function createTask(termKey, punctuation, truthValue, stamp = { creationTime: Date.now() }) {
        const parsedTerm = parseTerm(termKey);
        if (!parsedTerm) {
            console.warn(`Failed to parse term: ${termKey}`);
            return null;
        }
        return new Task(parsedTerm, punctuation, truthValue, stamp);
    }

    // Add initial knowledge about actions
    const taskDefs = [
        // Fact: To make coffee, you need water
        { termKey: '((&&, make_coffee, water) ==> coffee_made)', punctuation: '.', truthValue: { frequency: 0.9, confidence: 0.9 } },
        // Fact: To make coffee, you need coffee beans
        { termKey: '((&&, make_coffee, coffee_beans) ==> coffee_made)', punctuation: '.', truthValue: { frequency: 0.9, confidence: 0.9 } },
        // Fact: Water can be obtained from the tap
        { termKey: '(tap --> water_source)', punctuation: '.', truthValue: { frequency: 1.0, confidence: 0.95 } },
        // Fact: Coffee beans can be bought
        { termKey: '(buy --> obtain_coffee_beans)', punctuation: '.', truthValue: { frequency: 0.8, confidence: 0.9 } },
        // Goal: Make coffee
        { termKey: 'make_coffee', punctuation: '!', truthValue: { frequency: 1.0, confidence: 0.9 } },
        // Goal: Obtain water
        { termKey: 'obtain_water', punctuation: '!', truthValue: { frequency: 1.0, confidence: 0.8 } }
    ];

    // Create tasks and filter out any that failed to parse
    const tasks = taskDefs.map(def => createTask(def.termKey, def.punctuation, def.truthValue, def.stamp)).filter(Boolean);
    
    if (tasks.length === 0) {
        console.log("No valid tasks could be created. Exiting demo.");
        return;
    }

    await system.addTasks(tasks);

    console.log("Running 5 cognitive cycles to demonstrate planning...\n");
    
    for (let i = 0; i < 5; i++) {
        const result = await system.runCycle();
        console.log(`Cycle ${i+1} execution results:`, result.executionResults);
    }

    console.log("\n=== Demo Complete ===");
}

module.exports = planningDemo;

if (require.main === module) {
    planningDemo().catch(console.error);
}