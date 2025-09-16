import Task from '../src/core/Task.js';
import {parseTerm} from '../src/parser/parse-utils.js';
import SystemFactory from '../src/system/SystemFactory.js';
import {debug, info, warn} from '../src/utils/logger.js';

const anside = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    fg: {
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
    },
};

/**
 * A utility function to create a Task object from a definition.
 * @param {object} def - The task definition object.
 * @returns {Task|null} A new Task object or null if parsing fails.
 */
function createTask(def) {
    // Support for the new macro format
    if (def.sentence) {
        return createTaskFromMacro(def);
    }

    const parsedTerm = parseTerm(def.termKey);
    if (!parsedTerm) {
        warn(`Failed to parse term: ${def.termKey}`);
        return null;
    }
    return new Task(parsedTerm, def.punctuation, def.truthValue, def.stamp);
}

/**
 * Creates a Task from the new macro format { sentence, truth, stamp }.
 * @param {object} macro - The macro definition.
 * @returns {Task|null} A new Task object or null if parsing fails.
 */
function createTaskFromMacro(macro) {
    const {sentence, truth, stamp} = macro;
    const punctuation = sentence.slice(-1);
    const termKey = sentence.slice(0, -1);

    if (!['.', '?', '!'].includes(punctuation)) {
        warn(`Invalid or missing punctuation in macro sentence: "${sentence}"`);
        return null;
    }

    const truthValue = (truth && truth.length === 2)
        ? {frequency: truth[0], confidence: truth[1]}
        : undefined;

    const parsedTerm = parseTerm(termKey);
    if (!parsedTerm) {
        warn(`Failed to parse term from macro: "${termKey}"`);
        return null;
    }

    return new Task(parsedTerm, punctuation, truthValue, stamp);
}

/**
 * Prints a visually appealing header for a demo.
 * @param {string} demoName - The name of the demo.
 */
function printHeader(demoName) {
    console.log(`\n${anside.bright}${anside.fg.cyan}================================================================================${anside.reset}`);
    console.log(`${anside.bright}${anside.fg.yellow}                      🚀 Starting Demo: ${demoName}                       ${anside.reset}`);
    console.log(`${anside.bright}${anside.fg.cyan}================================================================================${anside.reset}`);
}

/**
 * Prints a visually appealing footer for a demo.
 * @param {string} demoName - The name of the demo.
 */
function printFooter(demoName) {
    console.log(`\n${anside.bright}${anside.fg.cyan}================================================================================${anside.reset}`);
    console.log(`${anside.bright}${anside.fg.yellow}                      ✅ Demo Completed: ${demoName}                      ${anside.reset}`);
    console.log(`${anside.bright}${anside.fg.cyan}================================================================================${anside.reset}\n`);
}

/**
 * A robust, standardized runner for executing system demonstrations.
 * It handles system creation, setup, execution, and logging.
 *
 * @param {string} demoName - The name of the demo for logging purposes.
 * @param {object[]} taskDefs - An array of task definitions to initialize the system with.
 * @param {object} [options={}] - Optional parameters to customize the demo run.
 * @param {number} [options.cycleCount=5] - The number of cognitive cycles to run.
 * @param {object} [options.config={}] - Custom configuration to override system defaults.
 * @param {object[]} [options.actionHandlers=[]] - Custom action handlers to register with the system.
 * @param {Function} [options.preCycleCallback=null] - A callback to run before the cycles start.
 * @param {Function} [options.postCycleCallback=null] - A callback to run after the cycles complete.
 * @returns {Promise<System>} The instance of the system after the demo run.
 */
async function runDemo(demoName, taskDefs, {
    cycleCount = 5,
    config = {},
    actionHandlers = [],
    preCycleCallback = null,
    postCycleCallback = null
} = {}) {
    printHeader(demoName);

    const system = await SystemFactory.createSystem(config);
    debug('System created.');

    actionHandlers.forEach(handler => system.actionExecutor.registerActionHandler(handler.name, handler.handler));
    if (actionHandlers.length > 0) debug(`Registered ${actionHandlers.length} custom action handlers.`);

    if (preCycleCallback) await preCycleCallback(system);

    const tasks = taskDefs.map(createTask).filter(Boolean);
    if (tasks.length > 0) {
        await system.addTasks(tasks);
        debug(`Added ${tasks.length} initial tasks.`);
    }

    if (cycleCount > 0) {
        debug(`Running ${cycleCount} system cycles...`);
        for (let i = 0; i < cycleCount; i++) {
            await system.runCycle();
        }
        debug('System cycles completed.');
    }

    if (postCycleCallback) await postCycleCallback(system, tasks);

    printFooter(demoName);
    return system;
}

export {createTask, runDemo, printHeader, printFooter};
