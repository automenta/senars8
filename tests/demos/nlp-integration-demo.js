// Category: Language Model
// Description: Shows the integration of Natural Language Processing (NLP) for parsing natural language input into Narsese.

import {runSystem} from '../../utils/runner.js';
import {SystemCommands} from '../../core/system/SystemCommands.js';
import {createTestSystem} from '../test-helpers.js';
import Task from '../../core/core/Task.js';

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

    const defaultOptions = {
        cycleCount: 2,
        preCycleCallback: async (sys) => {
            console.log("Processing natural language inputs...");
            for (const nl of naturalLanguageInputs) {
                const tasks = await sys.commandBus.request(SystemCommands.LM_NLP_PARSE, nl);
                if (tasks) {
                    await sys.addTasks(tasks);
                }
            }
        },
        postCycleCallback: async (sys) => {
            console.log("\nVerifying that NLP-derived tasks are in memory...");
            const tasks = await sys.introspection.queryTasks({});
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
    return await runSystem('NLP Integration Demo', [], mergedOptions);
}

export default nlpIntegrationDemo;

// This makes the demo runnable directly
if (import.meta.url.startsWith('file:')) {
    nlpIntegrationDemo().catch(console.error);
}

// This makes it testable
// In your test file, you would import and call:
// await nlpIntegrationDemo({ assertions: (system) => { /* your assertions */ } });