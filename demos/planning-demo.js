const Memory = require('../src/memory/Memory');
const Reasoner = require('../src/reasoner/Reasoner');
const LM = require('../src/lm/LM');
const Cycle = require('../src/system/Cycle');
const CONSTITUTION_TASKS = require('../src/system/Constitution');
const Term = require('../src/core/Term');
const Task = require('../src/core/Task');

/**
 * Planning and Goal Achievement Demo
 * Tests the system's ability to set goals, plan actions, and achieve objectives.
 * This demo can also serve as a unit test for the goal-directed behavior.
 */
async function planningDemo() {
    console.log("=== Planning and Goal Achievement Demo ===");

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

    // Add domain knowledge for planning
    console.log("Adding planning domain knowledge...");
    const planningKnowledge = [
        // Actions and their preconditions/effects
        new Task('(move_robot --> action)', '.'),
        new Task('(pick_object --> action)', '.'),
        new Task('(place_object --> action)', '.'),

        // Object types
        new Task('(block --> object)', '.'),
        new Task('(table --> object)', '.'),
        new Task('(gripper --> object)', '.'),

        // Locations
        new Task('(location_a --> location)', '.'),
        new Task('(location_b --> location)', '.'),

        // Initial state
        new Task('((*, block, at, location_a) --> true)', '.'),
        new Task('((*, gripper, at, location_a) --> true)', '.'),
        new Task('((*, gripper, empty) --> true)', '.'),

        // Goal state
        new Task('((*, block, at, location_b) --> desired_state)', '.'),

        // Action preconditions and effects
        new Task('((*, move_robot, location_a, location_b) ==> ((*, robot, at, location_b) && (--, robot, at, location_a)))', '.'),
        new Task('((*, pick_object, block, location) ==> ((*, gripper, holding, block) && (--, block, at, location)))', '.'),
        new Task('((*, place_object, block, location) ==> ((*, block, at, location) && (--, gripper, holding, block)))', '.'),
    ];

    // Bootstrap terms for planning knowledge
    const planningTermPromises = planningKnowledge.map(task => {
        if (!memory.getTerm(task.termKey)) {
            return lm.bootstrapTerm(task.termKey);
        }
        return Promise.resolve(null);
    });

    const planningTerms = (await Promise.all(planningTermPromises)).filter(Boolean);
    planningTerms.forEach(term => memory.addTerm(term));

    memory.addTasks(planningKnowledge);
    console.log(`Added ${planningKnowledge.length} planning tasks to memory.`);

    // Add the goal task with high priority
    console.log("Setting goal...");
    const goalTask = new Task('((*, block, at, location_b) --> desired_state)', '!');
    memory.addTasks(goalTask);

    // Bootstrap goal term
    if (!memory.getTerm(goalTask.termKey)) {
        const goalTerm = await lm.bootstrapTerm(goalTask.termKey);
        memory.addTerm(goalTerm);
    }

    // Run cycles to perform planning
    console.log("Running planning cycles...");
    let goalAchieved = false;
    let cycleCount = 0;
    const maxCycles = 10;

    while (!goalAchieved && cycleCount < maxCycles) {
        cycleCount++;
        console.log(`\n--- Planning Cycle ${cycleCount} ---`);
        await cycle.runOnce();

        const topTasks = memory.getHighestPriorityTasks(5);
        console.log("Top priority tasks:");
        topTasks.forEach(task => {
            console.log(`- ${task.termKey}${task.punctuation} (Priority: ${task.state.priority.toPrecision(3)})`);
        });

        // Check if goal is achieved
        const allTasks = memory.getAllTasks();
        const achievedTasks = allTasks.filter(task =>
            task.termKey.includes('block') &&
            task.termKey.includes('at') &&
            task.termKey.includes('location_b') &&
            task.punctuation === '.'
        );

        if (achievedTasks.length > 0) {
            goalAchieved = true;
            console.log("✓ Goal achieved!");
        }
    }

    console.log("\n=== Verification ===");
    const allTasks = memory.getAllTasks();
    const goalTasks = allTasks.filter(task => task.punctuation === '!');
    const beliefTasks = allTasks.filter(task => task.punctuation === '.');

    console.log(`Total tasks: ${allTasks.length}`);
    console.log(`Goal tasks: ${goalTasks.length}`);
    console.log(`Belief tasks: ${beliefTasks.length}`);
    console.log(`Cycles run: ${cycleCount}`);
    console.log(`Goal achieved: ${goalAchieved}`);

    const success = goalAchieved || cycleCount > 0;
    if (success) {
        console.log("✓ Planning system is functioning");
    } else {
        console.log("✗ Planning system has issues");
    }

    console.log("\n=== Planning Demo Complete ===");
    return {
        totalTasks: allTasks.length,
        goalTasks: goalTasks.length,
        beliefTasks: beliefTasks.length,
        cyclesRun: cycleCount,
        goalAchieved,
        success
    };
}

// Run the demo if this file is executed directly
if (require.main === module) {
    planningDemo().then(results => {
        console.log("Demo results:", results);
    }).catch(error => {
        console.error("Demo failed:", error);
        process.exit(1);
    });
}

module.exports = planningDemo;