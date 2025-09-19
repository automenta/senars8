// Category: Action & Planning
// Description: A comprehensive demonstration of the system's planning and action execution capabilities.

import {runDemo} from '../shared/demo-utils.js';
import {info} from '../src/utils/logger.js';

async function comprehensiveActionDemo() {
    info("--- 🚀 Welcome to the Comprehensive Action & Planning Demo! ---");

    // 1. Simple Action Execution
    info("\n--- 1. Simple Action Execution: Executing primitive actions ---");
    const simpleActionTasks = [
        {sentence: '(move_robot_kitchen)!', truth: [0.9, 0.8]},
        {sentence: '(activate_lighting_system)!', truth: [0.85, 0.75]},
    ];
    const simpleActionHandlers = [
        {
            name: 'move_*',
            handler: async (action) => info(`Action: Moving robot to ${action.name.replace('move_robot_', '')}`)
        },
        {
            name: 'activate_*',
            handler: async (action) => info(`Action: Activating ${action.name.replace('activate_', '')}`)
        },
    ];
    await runDemo('Simple Action Execution', simpleActionTasks, {cycleCount: 3, actionHandlers: simpleActionHandlers});

    // 2. Sequential and Parallel Actions
    info("\n--- 2. Sequential and Parallel Actions: Handling complex action sequences ---");
    const complexActionTasks = [
        {sentence: '(&/, (make --> coffee), (drink --> coffee))!', truth: [1.0, 0.9]},
        {sentence: '(||, (monitor --> temperature), (monitor --> pressure))!', truth: [1.0, 0.9]},
    ];
    const complexActionHandlers = [
        {name: 'make', handler: async (action) => info(`Action: Making ${action.parameters[0]}`)},
        {name: 'drink', handler: async (action) => info(`Action: Drinking ${action.parameters[0]}`)},
        {name: 'monitor', handler: async (action) => info(`Action: Monitoring ${action.parameters[0]}`)},
    ];
    await runDemo('Complex Action Execution', complexActionTasks, {
        cycleCount: 4,
        actionHandlers: complexActionHandlers
    });

    // 3. Simple Planning
    info("\n--- 3. Simple Planning: Creating a plan to achieve a goal ---");
    const planningTasks = [
        {sentence: '((get_cup & get_water) ==> have_drink).', truth: [1.0, 0.9]},
        {sentence: 'have_drink!', truth: [1.0, 0.9]}
    ];
    const planningActionHandlers = [
        {name: 'get_cup', handler: async () => info("Action: Getting a cup.")},
        {name: 'get_water', handler: async () => info("Action: Getting water.")},
    ];
    await runDemo('Simple Planning', planningTasks, {
        cycleCount: 8,
        actionHandlers: planningActionHandlers,
        postCycleCallback: (system) => {
            const plan = system.introspection.getPlan();
            if (plan && plan.steps.length > 0) {
                info(`✅ Planning successful: Generated a ${plan.steps.length}-step plan.`);
            } else {
                info("❌ Planning failed.");
            }
        }
    });

    info("\n--- 🚀 Comprehensive Action & Planning Demo Complete! ---");
}

export default comprehensiveActionDemo;

if (import.meta.url.startsWith('file:')) {
    comprehensiveActionDemo().catch(console.error);
}
