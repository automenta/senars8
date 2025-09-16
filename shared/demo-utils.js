import Task from '../src/core/Task.js';
import {parseTerm} from '../src/parser/parse-utils.js';
import SystemFactory from '../src/system/SystemFactory.js';
import {info, warn} from '../src/utils/logger.js';

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
        warn(`Failed to parse term: ${termKey}`);
        return null;
    }
    return new Task(parsedTerm, punctuation, truthValue, stamp);
}

async function runDemo(demoName, taskDefs, {
    cycleCount = 5,
    config = {},
    actionHandlers = [],
    preCycleCallback = null,
    postCycleCallback = null
} = {}) {
    info(`
--- Starting ${demoName} ---`);

    const system = await SystemFactory.createSystem(config);
    info('System created.');

    if (actionHandlers.length > 0) {
        actionHandlers.forEach(handler => {
            system.actionExecutor.registerActionHandler(handler.name, handler.handler);
        });
        info(`Registered ${actionHandlers.length} custom action handlers.`);
    }

    if (preCycleCallback) {
        await preCycleCallback(system);
    }

    const tasks = taskDefs.map(def => createTask(def.termKey, def.punctuation, def.truthValue)).filter(Boolean);

    if (tasks.length > 0) {
        await system.addTasks(tasks);
        info(`Added ${tasks.length} initial tasks.`);
    }

    if (cycleCount > 0) {
        info(`Running ${cycleCount} system cycles...`);
        for (let i = 0; i < cycleCount; i++) {
            const result = await system.runCycle();
            info(`Cycle ${i + 1} completed:`, {
                derivedTasks: result.derivedTasks,
                contradictions: result.contradictions,
                metaTasks: result.metaTasks,
                proactiveTasks: result.proactiveTasks
            });
        }
    }

    if (postCycleCallback) {
        await postCycleCallback(system, tasks);
    }

    info(`--- ${demoName} completed ---
`);
    return system;
}

export {
    createTask,
    runDemo,
};
