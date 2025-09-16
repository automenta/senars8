// Category: Reasoning
// Description: Demonstrates how the system detects and resolves contradictions between beliefs.

import { runDemo } from '../shared/demo-utils.js';

async function contradictionResolutionDemo() {
    const taskDefs = [
        // Conflicting beliefs about whether birds can fly
        { sentence: '(bird --> can_fly).', truth: [0.9, 0.9] },
        { sentence: '(penguin --> bird).', truth: [1.0, 0.9] },
        { sentence: '(penguin --> not_fly).', truth: [1.0, 0.9] },
        // Goal to resolve the contradiction
        { sentence: 'resolve_contradictions!', truth: [1.0, 0.9] }
    ];

    const postCycleCallback = (system) => {
        console.log("\nChecking for resolved contradictions...");
        const contradictions = system.introspection.getContradictions();
        if (contradictions.length === 0) {
            console.log("Contradiction successfully resolved.");
        } else {
            console.log(`Found ${contradictions.length} unresolved contradictions.`);
        }
    };

    await runDemo('Contradiction Resolution Demo', taskDefs, {
        cycleCount: 8,
        postCycleCallback
    });
}

export default contradictionResolutionDemo;

if (import.meta.url.startsWith('file:')) {
    contradictionResolutionDemo().catch(console.error);
}