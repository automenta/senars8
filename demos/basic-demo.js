// Category: Core Reasoning
// Description: A basic demonstration of the system's core reasoning capabilities, including deduction and inheritance.

import {runDemo} from '../shared/demo-utils.js';

async function basicDemo() {
    const taskDefs = [
        {sentence: '(bird --> animal).', truth: [1.0, 0.9]},
        {sentence: '(animal --> living).', truth: [1.0, 0.9]},
        {sentence: 'bird.', truth: [1.0, 0.9]},
        {sentence: '(living --> ?)?'}
    ];

    const postCycleCallback = async (system) => {
        console.log("\nQuerying for inferred knowledge...");
        const inferred = system.introspection.queryTasks({term: 'living', punctuation: '.'});
        if (inferred.length > 0) {
            console.log("Inferred that 'bird' is 'living'.");
        } else {
            console.log("Inference not yet made.");
        }
    };

    await runDemo('Basic Demo', taskDefs, {cycleCount: 5, postCycleCallback});
}

export default basicDemo;

if (import.meta.url.startsWith('file:')) {
    basicDemo().catch(console.error);
}