// Category: Action & Planning
// Description: Demonstrates the system's ability to execute a variety of complex actions, including parallel tasks, conditional logic, and hierarchical plans.

import { runDemo } from '../shared/demo-utils.js';

async function actionExecutionDemo() {
    const taskDefs = [
        // Parallel execution tasks
        { sentence: '(move_robot_kitchen)!', truth: [0.9, 0.8] },
        { sentence: '(activate_lighting_system)!', truth: [0.85, 0.75] },
        { sentence: '(monitor_temperature_sensors)!', truth: [0.95, 0.9] },

        // Conditional task
        { sentence: '(battery_low ==> charge_robot)!', truth: [0.9, 0.85] },

        // Hierarchical planning task
        { sentence: '(&/, navigate_to_charging_station, charge_battery, return_to_patrol_route)!', truth: [0.95, 0.9] },
    ];

    const actionHandlers = [
        { name: 'move_*', handler: async (action) => console.log(`Action: Moving robot to ${action.name.replace('move_robot_', '')}`) },
        { name: 'activate_*', handler: async (action) => console.log(`Action: Activating ${action.name.replace('activate_', '')}`) },
        { name: 'monitor_*', handler: async (action) => console.log(`Action: Monitoring ${action.name.replace('monitor_', '')}`) },
    ];

    await runDemo('Action Execution Demo', taskDefs, { cycleCount: 3, actionHandlers });
}

export default actionExecutionDemo;

if (import.meta.url.startsWith('file:')) {
    actionExecutionDemo().catch(console.error);
}