// Description: A blueprint demonstration of how to create, run, and inspect a SeNARS system.

import SystemFactory from '../src/system/SystemFactory.js';
import Task from '../src/core/Task.js';
import {parseTerm} from '../src/parser/parse-utils.js';
import {info} from '../src/utils/logger.js';

/**
 * This demo serves as a template for creating a client application (like a GUI or a bot)
 * that interacts with the SeNARS system. It shows the fundamental steps of creating a system,
 * adding knowledge, running cognitive cycles, and introspecting the system's state.
 */
async function comprehensiveSystemDemo() {
    info('--- Starting Comprehensive System Demo ---');

    // 1. --- SYSTEM CREATION ---
    // Use the SystemFactory to assemble a new SeNARS instance.
    // We can optionally pass in custom configuration to override the defaults.
    info('STEP 1: Creating the SeNARS system...');
    const system = await SystemFactory.createSystem();
    info('System created successfully.');

    // 2. --- EVENT LISTENING (INTROSPECTION) ---
    // The introspection API allows us to subscribe to events from the system's EventBus.
    // This is how a GUI would receive real-time updates.
    info('STEP 2: Subscribing to system events...');
    const onCycleEnd = (cycleResult) => {
        info(`EVENT [SystemCycleEnded]: A cycle has completed. Derived ${cycleResult.derivedTasks} new tasks.`);
    };
    system.introspection.on('SystemCycleEnded', onCycleEnd);
    info('Subscribed to "SystemCycleEnded" event.');


    // 3. --- ADDING KNOWLEDGE ---
    // We create knowledge and goals as `Task` objects and add them to the system.
    // A Task consists of a `Term` (parsed from a Narsese string), a punctuation mark (e.g., . for belief, ! for goal),
    // and a truth value (frequency and confidence).
    info('STEP 3: Adding initial knowledge and goals to memory...');
    const taskDefs = [
        // Foundational knowledge about animals
        {termKey: '(mammal --> warm_blooded)', punctuation: '.', truth: {frequency: 1.0, confidence: 0.9}},
        {termKey: '(bird --> warm_blooded)', punctuation: '.', truth: {frequency: 0.9, confidence: 0.8}},
        {termKey: '(dog --> mammal)', punctuation: '.', truth: {frequency: 1.0, confidence: 0.95}},
        {termKey: '(sparrow --> bird)', punctuation: '.', truth: {frequency: 1.0, confidence: 0.95}},

        // A goal for the system to pursue
        {termKey: '(<dog> --> warm_blooded)', punctuation: '?', truth: {frequency: 1.0, confidence: 0.9}} // Is a dog warm-blooded?
    ];

    const tasks = taskDefs.map(def => {
        const term = parseTerm(def.termKey);
        return term ? new Task(term, def.punctuation, def.truth) : null;
    }).filter(Boolean);

    await system.addTasks(tasks);
    info(`Added ${tasks.length} initial tasks to the system.`);


    // 4. --- RUNNING THE COGNITIVE CYCLE ---
    // We run the system for a few cycles to allow it to reason.
    // Each call to `runCycle` represents one "tick" of the system's thought process.
    const cycleCount = 5;
    info(`STEP 4: Running ${cycleCount} cognitive cycles...`);
    for (let i = 0; i < cycleCount; i++) {
        info(`--- Cycle ${i + 1} ---`);
        await system.runCycle();

        // 5. --- REAL-TIME INTROSPECTION ---
        // After each cycle, we can use the introspection API to check the system's state.
        const status = system.introspection.getStatus();
        info(`Introspection after cycle ${i + 1}: ${status.memory.shortTermTasks} tasks in short-term memory.`);
    }
    info('Finished running cycles.');


    // 6. --- FINAL STATE INSPECTION (INTROSPECTION) ---
    // After the run, we can query the final state of the memory to find the results of the reasoning process.
    info('STEP 6: Inspecting final memory state...');

    // Let's check if the system answered our question about the dog.
    const answerTasks = system.introspection.queryTasks({
        termKey: '(<dog> --> warm_blooded)',
        punctuation: '.' // We are looking for a belief (an answer)
    });

    if (answerTasks.length > 0) {
        // Sort by confidence to get the best answer
        answerTasks.sort((a, b) => b.state.truthValue.confidence - a.state.truthValue.confidence);
        const bestAnswer = answerTasks[0];
        info(`System's answer to "(<dog> --> warm_blooded)?": YES, with confidence ${bestAnswer.state.truthValue.confidence.toFixed(2)}`);
    } else {
        info('System did not find a definitive answer to our question in time.');
    }

    // Clean up the event listener
    system.introspection.off('SystemCycleEnded', onCycleEnd);

    info('--- Comprehensive System Demo Completed ---');
    return system;
}

export default comprehensiveSystemDemo;

// This allows the demo to be run directly from the command line
if (process.argv[1] && process.argv[1].includes('comprehensive-system-demo.js')) {
    comprehensiveSystemDemo().catch(console.error);
}
