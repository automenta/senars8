import {createTask} from './demo-utils.js';

/**
 * A standardized runner for executing a single benchmark test.
 * It handles system creation, task setup, cycle execution, and result verification.
 *
 * @param {object} testSystem - The system instance to use for the test.
 * @param {object[]} initialTaskDefs - An array of task definitions to initialize the system with.
 * @param {Function} verifyCallback - A callback function that receives the final system state
 *   and should return the result of the test.
 * @param {number} [cycleCount=5] - The number of cognitive cycles to run.
 * @returns {Promise<any>} The result returned by the verifyCallback.
 */
async function runBenchmarkTest(testSystem, initialTaskDefs, verifyCallback, cycleCount = 5) {
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
