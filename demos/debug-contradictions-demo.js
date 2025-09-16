// Category: Debugging
// Description: A utility demo for debugging the system's contradiction detection and resolution mechanisms.

import {runDemo} from '../shared/demo-utils.js';

async function debugContradictionsDemo() {
    const taskDefs = [
        {sentence: '(bird --> can_fly).', truth: [0.9, 0.9]},
        {sentence: '(penguin --> bird).', truth: [1.0, 0.9]},
        {sentence: '(penguin --> not_fly).', truth: [1.0, 0.9]},
    ];

    const postCycleCallback = (system) => {
        console.log("\nInspecting contradictions...");
        const contradictions = system.introspection.getContradictions();
        console.log(`Found ${contradictions.length} contradictions:`, contradictions.map(c => c.type));
    };

    await runDemo('Debug Contradictions Demo', taskDefs, {
        cycleCount: 3,
        postCycleCallback
    });
}

export default debugContradictionsDemo;

if (import.meta.url.startsWith('file:')) {
    debugContradictionsDemo().catch(console.error);
}