const Task = require('../src/core/Task');
const {parseTerm} = require('../src/parser/narseseParser');

/**
 * Creates a new Task with the given parameters.
 * @param {string} termKey - The term key for the task.
 * @param {string} punctuation - The punctuation mark for the task.
 * @param {object} truthValue - The truth value for the task.
 * @param {object} stamp - The stamp for the task.
 * @returns {Task|null} The created Task object, or null if parsing fails.
 */
function createTask(termKey, punctuation, truthValue, stamp = {creationTime: Date.now()}) {
    const parsedTerm = parseTerm(termKey);
    if (!parsedTerm) {
        console.warn(`Failed to parse term: ${termKey}`);
        return null;
    }
    return new Task(parsedTerm, punctuation, truthValue, stamp);
}

async function runDemo(demoName, taskDefs, cycleCount = 5) {
    const {System} = require('../src/index');

    console.log(`\n--- Starting ${demoName} ---`);

    const system = new System();
    console.log('System created.');

    const tasks = taskDefs.map(def => createTask(def.termKey, def.punctuation, def.truthValue)).filter(Boolean);

    if (tasks.length > 0) {
        await system.addTasks(tasks);
        console.log(`Added ${tasks.length} initial tasks.`);
    }

    if (cycleCount > 0) {
        console.log(`Running ${cycleCount} system cycles...`);
        for (let i = 0; i < cycleCount; i++) {
            const result = await system.runCycle();
            console.log(`Cycle ${i + 1} completed:`, {
                derivedTasks: result.derivedTasks,
                contradictions: result.contradictions,
                metaTasks: result.metaTasks,
                proactiveTasks: result.proactiveTasks
            });
        }
    }

    console.log(`--- ${demoName} completed ---\n`);
    return system;
}

module.exports = {
    createTask,
    runDemo,
};
