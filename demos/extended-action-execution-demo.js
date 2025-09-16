// Category: Action & Planning
// Description: An extended demonstration of the system's action execution capabilities, including sequential and parallel actions.

import { runDemo } from '../shared/demo-utils.js';

async function extendedActionExecutionDemo() {
    const taskDefs = [
        // A goal requiring a sequence of actions
        { sentence: '(&/, (make --> coffee), (drink --> coffee))!', truth: [1.0, 0.9] },
        // A goal requiring parallel actions
        { sentence: '(||, (monitor --> temperature), (monitor --> pressure))!', truth: [1.0, 0.9] },
    ];

    const actionHandlers = [
        { name: 'make', handler: async (action) => console.log(`Action: Making ${action.parameters[0]}`) },
        { name: 'drink', handler: async (action) => console.log(`Action: Drinking ${action.parameters[0]}`) },
        { name: 'monitor', handler: async (action) => console.log(`Action: Monitoring ${action.parameters[0]}`) },
    ];

    await runDemo('Extended Action Execution Demo', taskDefs, {
        cycleCount: 4,
        actionHandlers
    });
}

export default extendedActionExecutionDemo;

if (import.meta.url.startsWith('file:')) {
    extendedActionExecutionDemo().catch(console.error);
}