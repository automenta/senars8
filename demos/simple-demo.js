const Memory = require('../src/memory/Memory');
const Reasoner = require('../src/reasoner/Reasoner');
const LM = require('../src/lm/LM');
const Cycle = require('../src/system/Cycle');
const Task = require('../src/core/Task');

/**
 * Simple Demo
 * Tests the system's ability to perform basic inference with our new parser.
 */
async function simpleDemo() {
    console.log("=== Simple Demo with New Parser ===");

    // Initialize system components
    const lm = new LM();
    const memory = new Memory();
    const reasoner = new Reasoner();
    const cycle = new Cycle(memory, reasoner, lm);

    // Add simple knowledge
    console.log("Adding simple knowledge...");
    const simpleKnowledge = [
        // Basic relationships
        new Task('(cat --> mammal)', '.'),
        new Task('(mammal --> animal)', '.'),
        new Task('(cat --> furry)', '.'),
        new Task('(dog --> mammal)', '.'),
        new Task('(dog --> furry)', '.'),
        new Task('(bird --> animal)', '.'),
        new Task('(bird --> flying)', '.'),

        // Implications
        new Task('(mammal ==> furry)', '.'),
        new Task('(animal ==> living)', '.'),

        // Conjunctions
        new Task('((*, cat, furry) --> pet)', '.'),
    ];

    // Bootstrap terms for new knowledge
    const termPromises = simpleKnowledge.map(task => {
        if (!memory.getTerm(task.termKey)) {
            return lm.bootstrapTerm(task.termKey);
        }
        return Promise.resolve(null);
    });

    const newTerms = (await Promise.all(termPromises)).filter(Boolean);
    newTerms.forEach(term => memory.addTerm(term));

    memory.addTasks(simpleKnowledge);
    console.log(`Added ${simpleKnowledge.length} tasks to memory.`);

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

    // Check if new derived tasks were created
    const derivedTasks = allTasks.filter(task =>
        task.state.stamp.creationTime > Date.now() - 10000 // Created recently
    );

    if (derivedTasks.length > 0) {
        console.log(`✓ Generated ${derivedTasks.length} new derived tasks`);
        console.log("Derived tasks:");
        derivedTasks.forEach(task => {
            console.log(`- ${task.termKey}${task.punctuation}`);
        });
    } else {
        console.log("⚠ No new derived tasks were generated");
    }

    console.log("\n=== Simple Demo Complete ===");
    return {
        totalTasks: allTasks.length,
        derivedTasks: derivedTasks.length
    };
}

// Run the demo if this file is executed directly
if (require.main === module) {
    simpleDemo().then(results => {
        console.log("Demo results:", results);
    }).catch(error => {
        console.error("Demo failed:", error);
        process.exit(1);
    });
}

module.exports = simpleDemo;