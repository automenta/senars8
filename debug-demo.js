const System = require('./src/system/System');
const Task = require('./src/core/Task');
const {parseTerm} = require('./src/parser/narseseParser');

/**
 * Action Execution Demo
 * Demonstrates the system's enhanced action execution capabilities including
 * parallel execution, rollback mechanisms, and complex planning.
 */
async function actionExecutionDemo() {
    console.log("=== Action Execution Demo ===\n");

    const system = new System();
    await system.initialize();

    console.log("1. Testing parallel action execution...\n");

    try {
        // Create tasks for parallel execution
        const parallelTasks = [
            new Task(
                parseTerm('(move_robot_kitchen)'),
                '!',
                {frequency: 0.9, confidence: 0.8}
            ),
            new Task(
                parseTerm('(activate_lighting_system)'),
                '!',
                {frequency: 0.85, confidence: 0.75}
            ),
            new Task(
                parseTerm('(monitor_temperature_sensors)'),
                '!',
                {frequency: 0.95, confidence: 0.9}
            )
        ];

        console.log("Tasks created successfully");

        // Register custom action handlers for our parallel tasks
        system.actionExecutor.registerActionHandler('move_*', async (action) => {
            console.log(`Moving robot to ${action.name.replace('move_robot_', '')}`);
            return {success: true, action: action.name, result: 'Robot moved successfully'};
        });

        system.actionExecutor.registerActionHandler('activate_*', async (action) => {
            console.log(`Activating ${action.name.replace('activate_', '')}`);
            return {success: true, action: action.name, result: 'System activated successfully'};
        });

        system.actionExecutor.registerActionHandler('monitor_*', async (action) => {
            console.log(`Monitoring ${action.name.replace('monitor_', '')}`);
            return {success: true, action: action.name, result: 'Monitoring started successfully'};
        });

        console.log("Action handlers registered");

        // Add tasks to system
        await system.addTasks(parallelTasks);
        console.log("Tasks added to system");

        // Execute parallel actions
        console.log("Running system cycle...");
        const parallelResult = await system.runCycle();
        console.log(`Parallel execution results:`);
        console.log(`  - Derived Tasks: ${parallelResult.derivedTasks}`);
        console.log(`  - Contradictions: ${parallelResult.contradictions}`);
        console.log(`  - Meta Tasks: ${parallelResult.metaTasks}`);
    } catch (error) {
        console.error("Error during parallel action execution:", error.stack);
    }

    console.log("\n=== Demo Complete ===");
}

module.exports = actionExecutionDemo;

if (require.main === module) {
    actionExecutionDemo().catch(console.error);
}