// Category: Core API
// Description: A basic demo of the main system runner, showing the cognitive cycle in action.

import { runDemo } from '../shared/demo-utils.js';

async function systemRunnerDemo() {
    const taskDefs = [
        { sentence: '(system --> running).', truth: [1.0, 0.9] }
    ];

    const postCycleCallback = (system) => {
        console.log(`\nSystem ran for ${system.cycleCount} cycles.`);
        const status = system.introspection.getStatus();
        console.log(`Final memory size: ${status.memory.shortTermTasks} tasks.`);
    };

    await runDemo('System Runner Demo', taskDefs, {
        cycleCount: 3,
        postCycleCallback
    });
}

export default systemRunnerDemo;

if (import.meta.url.startsWith('file:')) {
    systemRunnerDemo().catch(console.error);
}
