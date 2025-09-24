import Task from '../../core/core/Task.js';
import {parseTerm} from '../../core/index.js';
import SystemFactory from '../../core/system/SystemFactory.js';
import {debug, warn} from '../../core/utils/logger.js';

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
 * Creates a Task from a macro definition { sentence, truth, stamp }.
 * @param {object} macro - The macro definition.
 * @returns {Task|null} A new Task object or null if parsing fails.
 */
function createTask(macro) {
    let termKey;
    let punctuation;
    let truthValue;
    let stamp;

    if (macro.term && macro.punctuation) { // It's a Task object
        termKey = macro.term.key;
        punctuation = macro.punctuation;
        truthValue = macro.truth;
        stamp = macro.stamp;
    } else if (macro.sentence) { // It's a plain object with a sentence
        const {sentence, truth, stamp: macroStamp} = macro;
        punctuation = sentence.slice(-1);
        termKey = sentence.slice(0, -1);
        truthValue = (truth && truth.length === 2)
            ? {frequency: truth[0], confidence: truth[1]}
            : undefined;
        stamp = macroStamp;
    } else {
        warn(`Invalid macro definition: ${JSON.stringify(macro)}`);
        return null;
    }

    if (!['.', '?', '!'].includes(punctuation)) {
        warn(`Invalid or missing punctuation in macro sentence: "${termKey}${punctuation}"`);
        return null;
    }

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
 * @param {Function} [options.assertions=null] - A callback containing test assertions to run.
 * @returns {Promise<System>} The instance of the system after the demo run.
 */
async function runDemo(demoName, taskDefs, {
    cycleCount = 5,
    config = {},
    components = {},
    actionHandlers = [],
    preCycleCallback = null,
    postCycleCallback = null,
    assertions = null,
    strategiesPath = undefined
} = {}) {
    printHeader(demoName);

    const system = SystemFactory.createSystem(config, components, strategiesPath);
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

    if (assertions) {
        debug('Running assertions...');
        await assertions(system);
        debug('Assertions completed.');
    }

    printFooter(demoName);
    return system;
}

export {createTask, runDemo, printHeader, printFooter};
