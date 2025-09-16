// Category: Narsese Language
// Description: Demonstrates parsing and reasoning with a richer, more expressive form of Narsese, including temporal operators.

import { runDemo } from '../shared/demo-utils.js';

async function enhancedNarseseDemo() {
    const taskDefs = [
        // Temporal operators and relationships
        { sentence: '(always, (bird --> animal)).', truth: [1.0, 0.9] },
        { sentence: '((task_a --> start) until (task_b --> finish)).', truth: [0.85, 0.8] },
        // Complex sequential conjunction
        { sentence: '(&/, (initialize --> system), (load --> data), (process --> information))!', truth: [0.9, 0.85] },
        // Question about a temporal relationship
        { sentence: '(next, (action --> take))?', truth: [1.0, 0.8] },
    ];

    const postCycleCallback = (system) => {
        console.log("\nInspecting tasks with enhanced Narsese...");
        const tasks = system.introspection.queryTasks({});
        const enhancedTasks = tasks.filter(t => t.term.isTemporal || t.term.isSequential);

        console.log(`Found ${enhancedTasks.length} tasks with enhanced Narsese constructs:`);
        enhancedTasks.slice(0, 5).forEach(task => {
            console.log(`  - ${task.termKey}`);
        });
    };

    await runDemo('Enhanced Narsese Demo', taskDefs, {
        cycleCount: 3,
        postCycleCallback
    });
}

export default enhancedNarseseDemo;

if (import.meta.url.startsWith('file:')) {
    enhancedNarseseDemo().catch(console.error);
}