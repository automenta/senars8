// Category: Reasoning
// Description: Demonstrates the system's ability to perform mathematical inference.

import {runDemo} from '../shared/demo-utils.js';

async function mathInferenceDemo() {
    const taskDefs = [
        // Axiom: An even number is divisible by 2.
        {sentence: '(&&, (even --> number), (divisible_by_2 --> property)).', truth: [1.0, 0.9]},
        // Fact: 4 is an even number.
        {sentence: '(4 --> even).', truth: [1.0, 0.9]},
        // Question: Is 4 divisible by 2?
        {sentence: '(4 --> divisible_by_2)?'}
    ];

    const postCycleCallback = (system) => {
        console.log("\nQuerying for mathematical inference...");
        const inference = system.introspection.queryTasks({termKey: '(4 --> divisible_by_2)', punctuation: '.'});
        if (inference.length > 0) {
            console.log("Successfully inferred that 4 is divisible by 2.");
        } else {
            console.log("Inference not yet made.");
        }
    };

    await runDemo('Math Inference Demo', taskDefs, {
        cycleCount: 5,
        postCycleCallback
    });
}

export default mathInferenceDemo;

if (import.meta.url.startsWith('file:')) {
    mathInferenceDemo().catch(console.error);
}