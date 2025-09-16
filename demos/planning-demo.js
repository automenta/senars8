// Category: Action & Planning
// Description: A demonstration of the system's planning capabilities using the Hierarchical Task Network (HTN) planner.

import { runDemo } from '../shared/demo-utils.js';

async function planningDemo() {
    const taskDefs = [
        // Knowledge about how to make coffee
        { sentence: '((make_coffee & has_water & has_beans) ==> coffee_made).', truth: [1.0, 0.9] },
        { sentence: '(get_water ==> has_water).', truth: [1.0, 0.9] },
        { sentence: '(get_beans ==> has_beans).', truth: [1.0, 0.9] },
        // The goal is to have coffee
        { sentence: 'coffee_made!', truth: [1.0, 0.9] }
    ];

    const actionHandlers = [
        { name: 'get_water', handler: async () => console.log("Action: Getting water.") },
        { name: 'get_beans', handler: async () => console.log("Action: Getting coffee beans.") },
        { name: 'make_coffee', handler: async () => console.log("Action: Making coffee.") },
    ];

    const postCycleCallback = (system) => {
        console.log("\nInspecting the generated plan...");
        const plan = system.introspection.getPlan();
        if (plan && plan.steps.length > 0) {
            console.log("Found a plan to make coffee:");
            plan.steps.forEach((step, i) => console.log(`  Step ${i + 1}: ${step.key}`));
        } else {
            console.log("No plan was generated.");
        }
    };

    await runDemo('Planning Demo (HTN)', taskDefs, {
        cycleCount: 10,
        actionHandlers,
        postCycleCallback
    });
}

export default planningDemo;

if (import.meta.url.startsWith('file:')) {
    planningDemo().catch(console.error);
}