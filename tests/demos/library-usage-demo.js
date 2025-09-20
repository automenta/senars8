// Category: API Usage
// Description: A simple example of how to import and use the SeNARS system as a library in a Node.js application.

import {runDemo} from '../../shared/demo-utils.js';
import {info} from '../../src/utils/logger.js';

async function libraryUsageDemo(options = {}) {
    const taskDefs = [
        {sentence: '(cat --> animal).', truth: [1.0, 0.9]},
        {sentence: '(animal --> living).', truth: [1.0, 0.9]},
        {sentence: '(cat --> living)?'}
    ];

    const defaultOptions = {
        cycleCount: 5,
        postCycleCallback: (system) => {
            info("Querying for inferred knowledge...");
            const inferred = system.introspection.queryTasks({termKey: '(cat --> living)', punctuation: '.'});
            if (inferred.length > 0) {
                info("Successfully inferred that a cat is a living thing.");
            } else {
                info("Inference not yet made.");
            }
        }
    };

    const mergedOptions = {...defaultOptions, ...options};
    return await runDemo('Library Usage Demo', taskDefs, mergedOptions);
}

export default libraryUsageDemo;

if (import.meta.url.startsWith('file:')) {
    libraryUsageDemo().catch(console.error);
}
