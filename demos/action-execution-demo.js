const System = require('../src/system/System');
const Task = require('../src/core/Task');
const { parseTerm } = require('../src/parser/NewParser');

/**
 * Action Execution Demo
 * Demonstrates the system's enhanced action execution capabilities including
 * parallel execution, rollback mechanisms, and complex planning.
 */
async function actionExecutionDemo() {
    console.log("=== Action Execution Demo ===\n");

    const system = new System();
    await system.initialize();

    // Enable rollback for this demo
    system.cycle.actionExecutor.enableRollback(true);

    console.log("1. Testing parallel action execution...\n");
    
    // Create tasks for parallel execution
    const parallelTasks = [
        new Task(
            parseTerm('(move_robot_kitchen)'),
            '!',
            { frequency: 0.9, confidence: 0.8 }
        ),
        new Task(
            parseTerm('(activate_lighting_system)'),
            '!',
            { frequency: 0.85, confidence: 0.75 }
        ),
        new Task(
            parseTerm('(monitor_temperature_sensors)'),
            '!',
            { frequency: 0.95, confidence: 0.9 }
        )
    ];

    // Register custom action handlers for our parallel tasks
    system.cycle.actionExecutor.registerActionHandler('move_*', async (action) => {
        console.log(`Moving robot to ${action.name.replace('move_robot_', '')}`);
        return { success: true, action: action.name, result: 'Robot moved successfully' };
    });

    system.cycle.actionExecutor.registerActionHandler('activate_*', async (action) => {
        console.log(`Activating ${action.name.replace('activate_', '')}`);
        return { success: true, action: action.name, result: 'System activated successfully' };
    });

    system.cycle.actionExecutor.registerActionHandler('monitor_*', async (action) => {
        console.log(`Monitoring ${action.name.replace('monitor_', '')}`);
        return { success: true, action: action.name, result: 'Monitoring started successfully' };
    });

    // Add tasks to system
    await system.addTasks(parallelTasks);

    // Execute parallel actions
    const parallelResult = await system.runCycle();
    console.log(`Parallel execution results:`);
    console.log(`  - Derived Tasks: ${parallelResult.derivedTasks}`);
    console.log(`  - Contradictions: ${parallelResult.contradictions}`);
    console.log(`  - Meta Tasks: ${parallelResult.metaTasks}`);

    console.log("\n2. Testing conditional actions...\n");
    
    // Create a conditional task
    const conditionalTask = new Task(
        parseTerm('(battery_low ==> charge_robot)'),
        '!',
        { frequency: 0.9, confidence: 0.85 }
    );

    await system.addTasks([conditionalTask]);

    const conditionalResult = await system.runCycle();
    console.log(`Conditional action results:`);
    console.log(`  - Derived Tasks: ${conditionalResult.derivedTasks}`);
    console.log(`  - Contradictions: ${conditionalResult.contradictions}`);
    console.log(`  - Meta Tasks: ${conditionalResult.metaTasks}`);

    console.log("\n3. Testing hierarchical planning...\n");
    
    // Create a complex goal task
    const complexGoalTask = new Task(
        parseTerm('(&/, navigate_to_charging_station, charge_battery, return_to_patrol_route)'),
        '!',
        { frequency: 0.95, confidence: 0.9 }
    );

    await system.addTasks([complexGoalTask]);

    const planningResult = await system.runCycle();
    console.log(`Hierarchical planning results:`);
    console.log(`  - Derived Tasks: ${planningResult.derivedTasks}`);
    console.log(`  - Contradictions: ${planningResult.contradictions}`);
    console.log(`  - Meta Tasks: ${planningResult.metaTasks}`);

    console.log("\n4. Testing choice actions...\n");
    
    // Create a choice task (try different approaches)
    const choiceTask = new Task(
        parseTerm('(|, approach_person_directly, approach_person_indirectly, wait_for_person_to_approach)'),
        '!',
        { frequency: 0.8, confidence: 0.7 }
    );

    await system.addTasks([choiceTask]);

    const choiceResult = await system.runCycle();
    console.log(`Choice action results:`);
    console.log(`  - Derived Tasks: ${choiceResult.derivedTasks}`);
    console.log(`  - Contradictions: ${choiceResult.contradictions}`);
    console.log(`  - Meta Tasks: ${choiceResult.metaTasks}`);

    console.log("\n5. Testing rollback mechanism...\n");
    
    // Create a task that will fail to trigger rollback
    const riskyTask = new Task(
        parseTerm('(perform_risky_operation)'),
        '!',
        { frequency: 0.7, confidence: 0.6 }
    );

    // Register a handler that will fail
    system.cycle.actionExecutor.registerActionHandler('perform_risky_operation', async (action) => {
        console.log("Attempting risky operation...");
        throw new Error("Risky operation failed due to unexpected conditions");
    });

    await system.addTasks([riskyTask]);

    const riskyResult = await system.runCycle();
    console.log(`Risky operation results:`);
    console.log(`  - Derived Tasks: ${riskyResult.derivedTasks}`);
    console.log(`  - Contradictions: ${riskyResult.contradictions}`);
    console.log(`  - Meta Tasks: ${riskyResult.metaTasks}`);

    console.log("\n=== Demo Complete ===");
}

module.exports = actionExecutionDemo;

if (require.main === module) {
    actionExecutionDemo().catch(console.error);
}