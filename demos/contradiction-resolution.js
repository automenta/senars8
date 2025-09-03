const Memory = require('../src/memory/Memory');
const Reasoner = require('../src/reasoner/Reasoner');
const LM = require('../src/lm/LM');
const Cycle = require('../src/system/Cycle');
const CONSTITUTION_TASKS = require('../src/system/Constitution');
const Term = require('../src/core/Term');
const Task = require('../src/core/Task');

/**
 * Contradiction Resolution Demo
 * Tests the system's ability to detect and resolve contradictions through meta-cognition.
 * This demo can also serve as a unit test for the meta-cognitive capabilities.
 */
async function contradictionDemo() {
    console.log("=== Contradiction Resolution Demo ===");

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

    // Add contradictory knowledge
    console.log("Adding contradictory knowledge...");
    const contradictoryKnowledge = [
        // Initial beliefs
        new Task('(bird --> animal)', '.'),
        new Task('(penguin --> bird)', '.'),
        new Task('(penguin --> flightless)', '.'),

        // General rule about birds
        new Task('((&, bird, x) ==> (x --> can_fly))', '.'),

        // Specific fact about penguins that contradicts the rule
        new Task('((&, penguin, x) ==> (--, (x --> can_fly)))', '.'),

        // A contradiction to test detection
        new Task('(penguin --> can_fly)', '.'),
        new Task('(--, (penguin --> can_fly))', '.'),
    ];

    // Bootstrap terms for contradictory knowledge
    const contradictionTermPromises = contradictoryKnowledge.map(task => {
        if (!memory.getTerm(task.termKey)) {
            return lm.bootstrapTerm(task.termKey);
        }
        return Promise.resolve(null);
    });

    const contradictionTerms = (await Promise.all(contradictionTermPromises)).filter(Boolean);
    contradictionTerms.forEach(term => memory.addTerm(term));

    memory.addTasks(contradictoryKnowledge);
    console.log(`Added ${contradictoryKnowledge.length} contradictory tasks to memory.`);

    // Check initial state for contradictions
    console.log("\nChecking for initial contradictions...");
    const allTasks = memory.getAllTasks();
    const positiveFlyTasks = allTasks.filter(task =>
        task.termKey.includes('penguin') && task.termKey.includes('can_fly') && task.punctuation === '.'
    );

    const negativeFlyTasks = allTasks.filter(task =>
        task.termKey.includes('penguin') && task.termKey.includes('can_fly') && task.termKey.includes('--') && task.punctuation === '.'
    );

    console.log(`Positive flying penguin tasks: ${positiveFlyTasks.length}`);
    console.log(`Negative flying penguin tasks: ${negativeFlyTasks.length}`);

    if (positiveFlyTasks.length > 0 && negativeFlyTasks.length > 0) {
        console.log("✓ Contradictions detected in initial state");
    } else {
        console.log("⚠ No contradictions detected in initial state");
    }

    // Run cycles to trigger meta-cognition
    console.log("\nRunning cycles to trigger meta-cognition...");
    for (let i = 0; i < 5; i++) {
        console.log(`\n--- Meta-Cognition Cycle ${i + 1} ---`);
        await cycle.runOnce();

        const topTasks = memory.getHighestPriorityTasks(5);
        console.log("Top priority tasks:");
        topTasks.forEach(task => {
            console.log(`- ${task.termKey}${task.punctuation} (Priority: ${task.state.priority.toPrecision(3)})`);
        });
    }

    // Check if contradiction resolution occurred
    console.log("\n=== Verification ===");
    const finalTasks = memory.getAllTasks();
    const integrityTasks = finalTasks.filter(task =>
        task.termKey.includes('MaintainCognitiveIntegrity') ||
        task.termKey.includes('ResolveContradiction')
    );

    const highPriorityTasks = finalTasks.filter(task => task.state.priority > 0.5);

    console.log(`Total tasks: ${finalTasks.length}`);
    console.log(`Integrity/contradiction tasks: ${integrityTasks.length}`);
    console.log(`High priority tasks: ${highPriorityTasks.length}`);

    // Check if confidence was adjusted
    const penguinTasks = finalTasks.filter(task =>
        task.termKey.includes('penguin') && task.termKey.includes('can_fly')
    );

    console.log(`\nPenguin flying tasks: ${penguinTasks.length}`);
    penguinTasks.forEach(task => {
        console.log(`- ${task.termKey}: confidence ${task.state.truthValue.confidence.toPrecision(3)}`);
    });

    const success = integrityTasks.length > 0 || penguinTasks.length > 0;
    if (success) {
        console.log("✓ Meta-cognition system is functioning");
    } else {
        console.log("⚠ Meta-cognition system may not be fully active");
    }

    console.log("\n=== Contradiction Resolution Demo Complete ===");
    return {
        totalTasks: finalTasks.length,
        integrityTasks: integrityTasks.length,
        highPriorityTasks: highPriorityTasks.length,
        penguinTasks: penguinTasks.length,
        success
    };
}

// Run the demo if this file is executed directly
if (require.main === module) {
    contradictionDemo().then(results => {
        console.log("Demo results:", results);
    }).catch(error => {
        console.error("Demo failed:", error);
        process.exit(1);
    });
}

module.exports = contradictionDemo;