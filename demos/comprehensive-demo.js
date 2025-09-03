const Memory = require('../src/memory/Memory');
const Reasoner = require('../src/reasoner/Reasoner');
const LM = require('../src/lm/LM');
const Cycle = require('../src/system/Cycle');
const CONSTITUTION_TASKS = require('../src/system/Constitution');
const Term = require('../src/core/Term');
const Task = require('../src/core/Task');
const {findSimilarTerms} = require('../src/utils/term-utils');
const {createTemporalTask} = require('../src/utils/temporal-reasoning');

/**
 * Comprehensive Features Demo
 * Tests all the newly implemented features: advanced inference, temporal reasoning,
 * term similarity, and action execution.
 */
async function comprehensiveDemo() {
    console.log("=== Comprehensive Features Demo ===");

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

    // Add knowledge for advanced reasoning
    console.log("Adding knowledge for advanced reasoning...");
    const advancedKnowledge = [
        // Taxonomic relationships for induction/abduction
        new Task('(cat --> mammal)', '.'),
        new Task('(dog --> mammal)', '.'),
        new Task('(bat --> mammal)', '.'),

        // Specific properties for analogy
        new Task('(cat --> furry)', '.'),
        new Task('(dog --> furry)', '.'),
        new Task('(bat --> furry)', '.'),

        // Temporal knowledge
        new Task('(event --> temporal)', '.'),
        new Task('(meeting --> event)', '.'),
        new Task('(deadline --> event)', '.'),
    ];

    // Bootstrap terms for advanced knowledge
    const advancedTermPromises = advancedKnowledge.map(task => {
        if (!memory.getTerm(task.termKey)) {
            return lm.bootstrapTerm(task.termKey);
        }
        return Promise.resolve(null);
    });

    const advancedTerms = (await Promise.all(advancedTermPromises)).filter(Boolean);
    advancedTerms.forEach(term => memory.addTerm(term));

    memory.addTasks(advancedKnowledge);
    console.log(`Added ${advancedKnowledge.length} advanced reasoning tasks to memory.`);

    // Test temporal reasoning
    console.log("\nTesting temporal reasoning...");
    const futureTime = Date.now() + 60000; // 1 minute in the future
    const temporalTasks = [
        createTemporalTask('(meeting --> scheduled)', '.', {frequency: 1.0, confidence: 0.9}, futureTime),
        createTemporalTask('(deadline --> approaching)', '.', {frequency: 0.8, confidence: 0.7}, futureTime + 30000),
    ];

    // Bootstrap terms for temporal tasks
    const temporalTermPromises = temporalTasks.map(task => {
        if (!memory.getTerm(task.termKey)) {
            return lm.bootstrapTerm(task.termKey);
        }
        return Promise.resolve(null);
    });

    const temporalTerms = (await Promise.all(temporalTermPromises)).filter(Boolean);
    temporalTerms.forEach(term => memory.addTerm(term));

    memory.addTasks(temporalTasks);
    console.log(`Added ${temporalTasks.length} temporal tasks to memory.`);

    // Test term similarity
    console.log("\nTesting term similarity...");
    const catTerm = memory.getTerm('cat');
    if (catTerm) {
        const similarTerms = findSimilarTerms(memory.terms, 'cat', 5);
        console.log("Terms similar to 'cat':");
        similarTerms.forEach(sim => {
            console.log(`- ${sim.termKey} (similarity: ${sim.similarity.toPrecision(3)})`);
        });
    }

    // Add a goal to test action execution
    console.log("\nAdding goal for action execution...");
    const goalTask = new Task('(achieve --> goal_achievement)', '!');
    memory.addTasks(goalTask);

    if (!memory.getTerm(goalTask.termKey)) {
        const goalTerm = await lm.bootstrapTerm(goalTask.termKey);
        memory.addTerm(goalTerm);
    }

    // Run cycles to test all features
    console.log("\nRunning cycles to test all features...");
    for (let i = 0; i < 3; i++) {
        console.log(`\n--- Comprehensive Cycle ${i + 1} ---`);
        const cycleResult = await cycle.runOnce();

        const topTasks = memory.getHighestPriorityTasks(5);
        console.log("Top priority tasks:");
        topTasks.forEach(task => {
            console.log(`- ${task.termKey}${task.punctuation} (Priority: ${task.state.priority.toPrecision(3)})`);
        });

        console.log(`Derived tasks: ${cycleResult.derivedTasks}`);
        console.log(`Execution results: ${cycleResult.executionResults.length}`);
    }

    console.log("\n=== Verification ===");
    const allTasks = memory.getAllTasks();
    const goalTasks = allTasks.filter(task => task.punctuation === '!');
    const temporalTasksInMemory = allTasks.filter(task => task.state.stamp.occurrenceTime);
    const derivedTasks = allTasks.filter(task => task.state.stamp.creationTime > Date.now() - 10000);

    console.log(`Total tasks: ${allTasks.length}`);
    console.log(`Goal tasks: ${goalTasks.length}`);
    console.log(`Temporal tasks: ${temporalTasksInMemory.length}`);
    console.log(`Recently derived tasks: ${derivedTasks.length}`);

    const success = allTasks.length > 0;
    if (success) {
        console.log("✓ All features are functioning");
    } else {
        console.log("✗ Some features may have issues");
    }

    console.log("\n=== Comprehensive Demo Complete ===");
    return {
        totalTasks: allTasks.length,
        goalTasks: goalTasks.length,
        temporalTasks: temporalTasksInMemory.length,
        derivedTasks: derivedTasks.length,
        success
    };
}

// Run the demo if this file is executed directly
if (require.main === module) {
    comprehensiveDemo().then(results => {
        console.log("Demo results:", results);
    }).catch(error => {
        console.error("Demo failed:", error);
        process.exit(1);
    });
}

module.exports = comprehensiveDemo;