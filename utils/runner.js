import SystemFactory from '../core/system/SystemFactory.js';
import Task from '../core/core/Task.js';
import {debug} from '../core/utils/logger.js';
import {printBanner} from '../common/ui.js';

/**
 * A robust, standardized runner for executing system demonstrations, benchmarks, and tests.
 * It handles system creation, setup, execution, and logging.
 *
 * @param {string} title - The title of the run for logging purposes.
 * @param {object[]} taskDefs - An array of task definitions to initialize the system with.
 * @param {object} [options={}] - Optional parameters to customize the run.
 * @param {number} [options.cycleCount=5] - The number of cognitive cycles to run.
 * @param {object} [options.config={}] - Custom configuration to override system defaults.
 * @param {object} [options.components={}] - Custom components to override system defaults.
 * @param {object[]} [options.actionHandlers=[]] - Custom action handlers to register with the system.
 * @param {Function} [options.preCycleCallback=null] - A callback to run before the cycles start.
 * @param {Function} [options.postCycleCallback=null] - A callback to run after the cycles complete.
 * @param {Function} [options.verify=null] - A callback containing test assertions to run.
 * @param {string} [options.strategiesPath=undefined] - Path to custom strategies.
 * @returns {Promise<System|any>} The instance of the system after the run, or the result of the verify callback.
 */
async function runSystem(title, taskDefs, {
    system: existingSystem = null,
    cycleCount = 5,
    config = {},
    components = {},
    actionHandlers = [],
    preCycleCallback = null,
    postCycleCallback = null,
    verify = null,
    strategiesPath = undefined
} = {}) {
    printBanner(`🚀 Starting: ${title}`, {width: 80});

    const system = existingSystem || SystemFactory.createSystem(config, components, strategiesPath);
    if (!existingSystem) {
        debug('System created.');
    }

    actionHandlers.forEach(handler => system.actionExecutor.registerActionHandler(handler.name, handler.handler));
    if (actionHandlers.length > 0) debug(`Registered ${actionHandlers.length} custom action handlers.`);

    if (preCycleCallback) await preCycleCallback(system);

    const tasks = taskDefs.map(Task.fromMacro).filter(Boolean);
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

    let result = system;
    if (verify) {
        debug('Running verification...');
        result = await verify(system);
        debug('Verification completed.');
    }

    printBanner(`✅ Completed: ${title}`, {
        width: 80,
        isFooter: true
    });
    return result;
}

export {runSystem};