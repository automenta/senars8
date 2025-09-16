// Description: Demonstrates enhanced action execution, including parallel execution, rollback, and complex planning.
const { createTask, runDemo } = require('../shared/demo-utils.js');

async function actionExecutionDemo() {
    const taskDefs = [
        // Parallel execution tasks
        {
            termKey: '(move_robot_kitchen)',
            punctuation: '!',
            truthValue: {
                frequency: 0.9,
                confidence: 0.8
            }
        },
        {
            termKey: '(activate_lighting_system)',
            punctuation: '!',
            truthValue: {
                frequency: 0.85,
                confidence: 0.75
            }
        },
        {
            termKey: '(monitor_temperature_sensors)',
            punctuation: '!',
            truthValue: {
                frequency: 0.95,
                confidence: 0.9
            }
        },

        // Conditional task
        {
            termKey: '(battery_low ==> charge_robot)',
            punctuation: '!',
            truthValue: {
                frequency: 0.9,
                confidence: 0.85
            }
        },

        // Hierarchical planning task
        {
            termKey: '(&/, navigate_to_charging_station, charge_battery, return_to_patrol_route)',
            punctuation: '!',
            truthValue: {
                frequency: 0.95,
                confidence: 0.9
            }
        },

        // Choice task
        {
            termKey: '(|, approach_person_directly, approach_person_indirectly, wait_for_person_to_approach)',
            punctuation: '!',
            truthValue: {
                frequency: 0.8,
                confidence: 0.7
            }
        },

        // Rollback task
        {
            termKey: '(perform_risky_operation)',
            punctuation: '!',
            truthValue: {
                frequency: 0.7,
                confidence: 0.6
            }
        },
    ];

    const actionHandlers = [{
        name: 'move_*',
        handler: async (action) => {
            console.log(`Moving robot to ${action.name.replace('move_robot_', '')}`);
            return {
                success: true,
                action: action.name,
                result: 'Robot moved successfully'
            };
        }
    }, {
        name: 'activate_*',
        handler: async (action) => {
            console.log(`Activating ${action.name.replace('activate_', '')}`);
            return {
                success: true,
                action: action.name,
                result: 'System activated successfully'
            };
        }
    }, {
        name: 'monitor_*',
        handler: async (action) => {
            console.log(`Monitoring ${action.name.replace('monitor_', '')}`);
            return {
                success: true,
                action: action.name,
                result: 'Monitoring started successfully'
            };
        }
    }, {
        name: 'perform_risky_operation',
        handler: async (action) => {
            console.log("Attempting risky operation...");
            throw new Error("Risky operation failed due to unexpected conditions");
        }
    }, ];

    await runDemo('Action Execution Demo', taskDefs, {
        cycleCount: 5,
        actionHandlers
    });
}

module.exports = actionExecutionDemo;

if (require.main === module) {
    actionExecutionDemo().catch(console.error);
}