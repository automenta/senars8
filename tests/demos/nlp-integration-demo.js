// Category: Language Model
// Description: Shows the integration of Natural Language Processing (NLP) for parsing natural language input into Narsese.

import {runDemo} from '../../shared/demo-utils.js';

/**
 * A unified demo that demonstrates NLP integration capabilities.
 * Can be run as a standalone example or as a unit test.
 *
 * @param {object} options - Configuration options
 * @param {Function} [options.assertions] - Optional assertions for testing
 * @param {Function} [options.preCycleCallback] - Optional callback before cycles run
 * @param {Function} [options.postCycleCallback] - Optional callback after cycles run
 * @returns {Promise<System>} The system instance after running
 */
async function nlpIntegrationDemo(options = {}) {
    const naturalLanguageInputs = [
        "A bird is an animal.",
        "Is a bird a living thing?",
        "Find out why the sky is blue."
    ];

    const taskDefs = []; // Will be populated by the preCycleCallback

    const defaultOptions = {
        cycleCount: 2,
        preCycleCallback: async (system) => {
            console.log("Processing natural language inputs...");
            for (const nl of naturalLanguageInputs) {
                const tasks = await system.lm.nlp.parse(nl);
                taskDefs.push(...tasks);
            }
            console.log("Converted natural language to tasks:", taskDefs.map(t => t.termKey));
        },
        postCycleCallback: (system) => {
            console.log("\nVerifying that NLP-derived tasks are in memory...");
            const tasks = system.introspection.queryTasks({});
            const nlpTask = tasks.find(t => t.termKey.includes('bird') && t.termKey.includes('animal'));
            if (nlpTask) {
                console.log("Found task derived from 'A bird is an animal.'");
            } else {
                console.log("Could not verify NLP-derived task.");
            }
        }
    };

    // Merge options with defaults
    const mergedOptions = {...defaultOptions, ...options};

    // Run the demo using the shared utility
    return await runDemo('NLP Integration Demo', taskDefs, mergedOptions);
}

export default nlpIntegrationDemo;

// This makes the demo runnable directly
if (import.meta.url.startsWith('file:')) {
    nlpIntegrationDemo().catch(console.error);
}

// This makes it testable
// In your test file, you would import and call:
// await nlpIntegrationDemo({ assertions: (system) => { /* your assertions */ } });