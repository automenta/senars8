const Memory = require('../src/memory/Memory');
const Reasoner = require('../src/reasoner/Reasoner');
const LM = require('../src/lm/LM');
const Cycle = require('../src/system/Cycle');
const CONSTITUTION_TASKS = require('../src/system/Constitution');
const Term = require('../src/core/Term');
const Task = require('../src/core/Task');

/**
 * Math Inference Demo
 * Tests the system's ability to perform logical inference using mathematical relationships.
 * This demo can also serve as a unit test for the inference engine.
 */
async function mathInferenceDemo() {
    console.log("=== Math Inference Demo ===");

    // Initialize system components
    const lm = new LM();
    const memory = new Memory();
    const reasoner = new Reasoner();
    const cycle = new Cycle(memory, reasoner, lm);

    // Load Constitution
    memory.addTasks(CONSTITUTION_TASKS);

    // Bootstrap constitutional terms
    const termPromises = CONSTITUTION_TASKS.map(task => {
        if (!memory.getTerm(task.termKey)) {
            return lm.bootstrapTerm(task.termKey);
        }
        return Promise.resolve(null);
    });

    const newTerms = (await Promise.all(termPromises)).filter(Boolean);
    newTerms.forEach(term => memory.addTerm(term));

    // Add mathematical knowledge
    console.log("Adding mathematical knowledge...");
    const mathKnowledge = [
        // Basic arithmetic relationships
        new Task('(addition --> arithmetic_operation)', '.'),
        new Task('(multiplication --> arithmetic_operation)', '.'),
        new Task('(2 --> number)', '.'),
        new Task('(3 --> number)', '.'),
        new Task('(6 --> number)', '.'),

        // Mathematical facts
        new Task('((&, addition, 2, 3) --> 5)', '.'),
        new Task('((&, multiplication, 2, 3) --> 6)', '.'),

        // Implications for reasoning
        new Task('((&, arithmetic_operation, x, y) ==> result)', '.'),
    ];

    // Bootstrap terms for new knowledge
    const mathTermPromises = mathKnowledge.map(task => {
        if (!memory.getTerm(task.termKey)) {
            return lm.bootstrapTerm(task.termKey);
        }
        return Promise.resolve(null);
    });

    const mathTerms = (await Promise.all(mathTermPromises)).filter(Boolean);
    mathTerms.forEach(term => memory.addTerm(term));

    memory.addTasks(mathKnowledge);
    console.log(`Added ${mathKnowledge.length} mathematical tasks to memory.`);

    // Run cycles to perform inference
    console.log("Running inference cycles...");
    for (let i = 0; i < 3; i++) {
        console.log(`\n--- Cycle ${i + 1} ---`);
        await cycle.runOnce();

        const topTasks = memory.getHighestPriorityTasks(5);
        console.log("Top priority tasks:");
        topTasks.forEach(task => {
            console.log(`- ${task.termKey}${task.punctuation} (Priority: ${task.state.priority.toPrecision(3)})`);
        });
    }

    // Verify inference results
    console.log("\n=== Verification ===");
    const allTasks = memory.getAllTasks();
    const multiplicationTasks = allTasks.filter(task =>
        task.termKey.includes('multiplication') && task.termKey.includes('2') && task.termKey.includes('3')
    );

    if (multiplicationTasks.length > 0) {
        console.log("✓ Successfully processed multiplication tasks");
    } else {
        console.log("✗ Failed to process multiplication tasks");
    }

    // Check if new derived tasks were created
    const derivedTasks = allTasks.filter(task =>
        task.state.stamp.creationTime > Date.now() - 10000 // Created recently
    );

    if (derivedTasks.length > 0) {
        console.log(`✓ Generated ${derivedTasks.length} new derived tasks`);
    } else {
        console.log("⚠ No new derived tasks were generated");
    }

    console.log("\n=== Math Inference Demo Complete ===");
    return {
        totalTasks: allTasks.length,
        multiplicationTasks: multiplicationTasks.length,
        derivedTasks: derivedTasks.length
    };
}

// Run the demo if this file is executed directly
if (require.main === module) {
    mathInferenceDemo().then(results => {
        console.log("Demo results:", results);
    }).catch(error => {
        console.error("Demo failed:", error);
        process.exit(1);
    });
}

module.exports = mathInferenceDemo;