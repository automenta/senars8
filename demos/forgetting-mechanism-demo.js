const assert = require('assert');
const {System} = require('../src');
const Task = require('../src/core/Task');
const {parseTerm} = require('../src/parser/parse-utils');
const config = require('../src/config');

async function forgettingMechanismDemo() {
    console.log('--- Starting Forgetting Mechanism Demo ---');

    try {
        const system = new System();
        await system.initialize();
        const memory = system.memory;

        const constitutionalTasks = memory.getAllTasks().length;
        console.log(`System initialized with ${constitutionalTasks} constitutional tasks.`);


        // We need to manually manipulate time, so we'll set timestamps far in the past.
        const now = BigInt(Date.now());
        const oneDayInMs = BigInt(24 * 3600 * 1000);
        const twoDaysAgo = now - (oneDayInMs * BigInt(2));

        // Task 1: Old and unimportant. Should be pruned from short-term memory.
        const oldUnimportantTerm = parseTerm('(old_and_unimportant --> property)');
        const oldUnimportantTask = new Task(oldUnimportantTerm, '.', {
            frequency: 1.0,
            confidence: 0.1
        }, {creationTime: twoDaysAgo, lastAccessed: twoDaysAgo});
        oldUnimportantTask.state.priority = 0.1;

        // Task 2: Old but important (high priority). Should be consolidated and kept.
        const oldImportantPriorityTerm = parseTerm('(old_but_high_priority --> property)');
        const oldImportantPriorityTask = new Task(oldImportantPriorityTerm, '.', {
            frequency: 1.0,
            confidence: 0.5
        }, {creationTime: twoDaysAgo, lastAccessed: twoDaysAgo});
        oldImportantPriorityTask.state.priority = config.memory.CONSOLIDATION_PRIORITY_THRESHOLD + 0.1; // Ensure it gets consolidated

        // Task 3: Old but important (high confidence). Should be consolidated and kept.
        const oldImportantConfidenceTerm = parseTerm('(old_but_high_confidence --> property)');
        const oldImportantConfidenceTask = new Task(oldImportantConfidenceTerm, '.', {
            frequency: 1.0,
            confidence: config.memory.CONSOLIDATION_CONFIDENCE_THRESHOLD + 0.1
        }, {creationTime: twoDaysAgo, lastAccessed: twoDaysAgo});
        oldImportantConfidenceTask.state.priority = 0.1; // Low priority, but high confidence

        // Task 4: New task. Should remain in short-term memory.
        const newTerm = parseTerm('(a_new_task --> property)');
        const newTask = new Task(newTerm, '.');

        // Add all tasks to memory
        const demoTasks = [
            oldUnimportantTask,
            oldImportantPriorityTask,
            oldImportantConfidenceTask,
            newTask
        ];
        await system.addTasks(demoTasks);

        const expectedInitialShortTerm = constitutionalTasks + demoTasks.length;
        console.log(`Initial state: ${memory.shortTermTasks.size} short-term tasks, ${memory.longTermTasks.size} long-term tasks.`);
        assert.strictEqual(memory.shortTermTasks.size, expectedInitialShortTerm, 'Demo Failed: Initial short-term memory size is incorrect.');
        assert.strictEqual(memory.longTermTasks.size, 0, 'Demo Failed: Initial long-term memory size should be 0.');

        // Run enough cycles to trigger memory maintenance (consolidation and pruning)
        const maintenanceFrequency = config.memory.MAINTENANCE_CYCLE_FREQUENCY;
        console.log(`Running ${maintenanceFrequency} cycles to trigger memory maintenance...`);
        for (let i = 0; i < maintenanceFrequency; i++) {
            await system.runCycle();
        }

        console.log('--- Verification ---');
        const {shortTermTasks, longTermTasks} = memory;
        console.log(`Final state: ${shortTermTasks.size} short-term tasks, ${longTermTasks.size} long-term tasks.`);

        // Verification for Task 1 (Old and unimportant)
        assert(!shortTermTasks.has(oldUnimportantTask.id), 'Demo Failed: Old, unimportant task should have been pruned from short-term memory.');
        assert(!longTermTasks.has(oldUnimportantTask.id), 'Demo Failed: Old, unimportant task should not be in long-term memory.');
        console.log('✅ PASSED: Old, unimportant task was forgotten.');

        // Verification for Task 2 (Old but high priority)
        assert(!shortTermTasks.has(oldImportantPriorityTask.id), 'Demo Failed: High-priority task should have been consolidated from short-term memory.');
        assert(longTermTasks.has(oldImportantPriorityTask.id), 'Demo Failed: High-priority task should be in long-term memory.');
        console.log('✅ PASSED: Old, high-priority task was consolidated and kept.');

        // Verification for Task 3 (Old but high confidence)
        assert(!shortTermTasks.has(oldImportantConfidenceTask.id), 'Demo Failed: High-confidence task should have been consolidated from short-term memory.');
        assert(longTermTasks.has(oldImportantConfidenceTask.id), 'Demo Failed: High-confidence task should be in long-term memory.');
        console.log('✅ PASSED: Old, high-confidence task was consolidated and kept.');

        // Verification for Task 4 (New task)
        assert(shortTermTasks.has(newTask.id), 'Demo Failed: New task should remain in short-term memory.');
        assert(!longTermTasks.has(newTask.id), 'Demo Failed: New task should not have been consolidated yet.');
        console.log('✅ PASSED: New task was correctly retained in short-term memory.');

        console.log('\n--- Forgetting Mechanism Demo Completed Successfully! ---');
        system.stop();
    } catch (error) {
        console.error('Forgetting Mechanism Demo Failed:', error);
        process.exit(1);
    }
}

// Run the demo
forgettingMechanismDemo();
