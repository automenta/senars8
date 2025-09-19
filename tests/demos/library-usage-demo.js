// Category: API Usage
// Description: A simple example of how to import and use the SeNARS system as a library in a Node.js application.

import {runDemo} from '../shared/demo-utils.js';

async function libraryUsageDemo() {
    const taskDefs = [
        {sentence: '(cat --> animal).', truth: [1.0, 0.9]},
        {sentence: '(animal --> living).', truth: [1.0, 0.9]},
        {sentence: '(cat --> living)?'}
    ];

    const postCycleCallback = (system) => {
        console.log("\nQuerying for inferred knowledge...");
        const inferred = system.introspection.queryTasks({termKey: '(cat --> living)', punctuation: '.'});
        if (inferred.length > 0) {
            console.log("Successfully inferred that a cat is a living thing.");
        } else {
            console.log("Inference not yet made.");
        }
    };

    await runDemo('Library Usage Demo', taskDefs, {
        cycleCount: 5,
        postCycleCallback
    });
}

export default libraryUsageDemo;

if (import.meta.url.startsWith('file:')) {
    libraryUsageDemo().catch(console.error);
}
