import {SystemFactory} from '../src/index.js';
import {createTask} from './demo-utils.js';

/**
 * A standardized runner for executing a single benchmark test.
 * It handles system creation, task setup, cycle execution, and result verification.
 *
 * @param {object[]} initialTaskDefs - An array of task definitions to initialize the system with.
 * @param {Function} verifyCallback - A callback function that receives the final system state
 *   and should return the result of the test.
 * @param {number} [cycleCount=5] - The number of cognitive cycles to run.
 * @returns {Promise<any>} The result returned by the verifyCallback.
 */
async function runBenchmarkTest(initialTaskDefs, verifyCallback, cycleCount = 5) {
    const testSystem = await SystemFactory.createSystem();

    const initialTasks = initialTaskDefs.map(def => createTask(def)).filter(Boolean);
    if (initialTasks.length > 0) {
        await testSystem.addTasks(initialTasks);
    }

    for (let i = 0; i < cycleCount; i++) {
        await testSystem.runCycle();
    }

    return await verifyCallback(testSystem);
}

export {runBenchmarkTest};
