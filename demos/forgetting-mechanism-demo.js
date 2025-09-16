// Description: Illustrates the time-based forgetting strategy for decaying belief confidence.
const assert = require('assert');
const {
    runDemo
} = require('../shared/demo-utils');
const Task = require('../src/core/Task');
const {
    parseTerm
} = require('../src/parser/parse-utils');
const config = require('../src/config');

async function forgettingMechanismDemo() {
    const now = BigInt(Date.now());
    const oneDayInMs = BigInt(24 * 3600 * 1000);
    const twoDaysAgo = now - (oneDayInMs * BigInt(2));

    const oldUnimportantTerm = parseTerm('(old_and_unimportant --> property)');
    const oldUnimportantTask = new Task(oldUnimportantTerm, '.', {
        frequency: 1.0,
        confidence: 0.1
    }, {
        creationTime: twoDaysAgo,
        lastAccessed: twoDaysAgo
    });
    oldUnimportantTask.state.priority = 0.1;

    const oldImportantPriorityTerm = parseTerm('(old_but_high_priority --> property)');
    const oldImportantPriorityTask = new Task(oldImportantPriorityTerm, '.', {
        frequency: 1.0,
        confidence: 0.5
    }, {
        creationTime: twoDaysAgo,
        lastAccessed: twoDaysAgo
    });
    oldImportantPriorityTask.state.priority = config.memory.CONSOLIDATION_PRIORITY_THRESHOLD + 0.1;

    const oldImportantConfidenceTerm = parseTerm('(old_but_high_confidence --> property)');
    const oldImportantConfidenceTask = new Task(oldImportantConfidenceTerm, '.', {
        frequency: 1.0,
        confidence: config.memory.CONSOLIDATION_CONFIDENCE_THRESHOLD + 0.1
    }, {
        creationTime: twoDaysAgo,
        lastAccessed: twoDaysAgo
    });
    oldImportantConfidenceTask.state.priority = 0.1;

    const newTerm = parseTerm('(a_new_task --> property)');
    const newTask = new Task(newTerm, '.');

    const taskDefs = [
        oldUnimportantTask,
        oldImportantPriorityTask,
        oldImportantConfidenceTask,
        newTask
    ];

    const postCycleCallback = (system) => {
        console.log('--- Verification ---');
        const {
            shortTermTasks,
            longTermTasks
        } = system.memory;
        console.log(`Final state: ${shortTermTasks.size} short-term tasks, ${longTermTasks.size} long-term tasks.`);

        assert(!shortTermTasks.has(oldUnimportantTask.id), 'Demo Failed: Old, unimportant task should have been pruned from short-term memory.');
        assert(!longTermTasks.has(oldUnimportantTask.id), 'Demo Failed: Old, unimportant task should not be in long-term memory.');
        console.log('✅ PASSED: Old, unimportant task was forgotten.');

        assert(!shortTermTasks.has(oldImportantPriorityTask.id), 'Demo Failed: High-priority task should have been consolidated from short-term memory.');
        assert(longTermTasks.has(oldImportantPriorityTask.id), 'Demo Failed: High-priority task should be in long-term memory.');
        console.log('✅ PASSED: Old, high-priority task was consolidated and kept.');

        assert(!shortTermTasks.has(oldImportantConfidenceTask.id), 'Demo Failed: High-confidence task should have been consolidated from short-term memory.');
        assert(longTermTasks.has(oldImportantConfidenceTask.id), 'Demo Failed: High-confidence task should be in long-term memory.');
        console.log('✅ PASSED: Old, high-confidence task was consolidated and kept.');

        assert(shortTermTasks.has(newTask.id), 'Demo Failed: New task should remain in short-term memory.');
        assert(!longTermTasks.has(newTask.id), 'Demo Failed: New task should not have been consolidated yet.');
        console.log('✅ PASSED: New task was correctly retained in short-term memory.');

        console.log('\n--- Forgetting Mechanism Demo Completed Successfully! ---');
        system.stop();
    };

    await runDemo('Forgetting Mechanism Demo', taskDefs, {
        cycleCount: config.memory.MAINTENANCE_CYCLE_FREQUENCY,
        postCycleCallback
    });
}

forgettingMechanismDemo().catch(console.error);
