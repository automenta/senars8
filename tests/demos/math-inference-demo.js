// Category: Reasoning
// Description: Demonstrates the system's ability to perform mathematical inference.

import {runDemo} from '../../utils/shared/demo-utils.js';

/**
 * A unified demo that demonstrates mathematical inference capabilities.
 * Can be run as a standalone example or as a unit test.
 *
 * @param {object} options - Configuration options
 * @param {Function} [options.assertions] - Optional assertions for testing
 * @param {Function} [options.preCycleCallback] - Optional callback before cycles run
 * @param {Function} [options.postCycleCallback] - Optional callback after cycles run
 * @returns {Promise<System>} The system instance after running
 */
async function mathInferenceDemo(options = {}) {
    const taskDefs = [
        // Axiom: An even number is divisible by 2.
        {sentence: '(&&, (even --> number), (divisible_by_2 --> property)).', truth: [1.0, 0.9]},
        // Fact: 4 is an even number.
        {sentence: '(4 --> even).', truth: [1.0, 0.9]},
        // Question: Is 4 divisible by 2?
        {sentence: '(4 --> divisible_by_2)?'}
    ];

    const defaultOptions = {
        cycleCount: 5,
        postCycleCallback: (system) => {
            console.log("\nQuerying for mathematical inference...");
            const inference = system.introspection.queryTasks({termKey: '(4 --> divisible_by_2)', punctuation: '.'});
            if (inference.length > 0) {
                console.log("Successfully inferred that 4 is divisible by 2.");
            } else {
                console.log("Inference not yet made.");
            }
        }
    };

    // Merge options with defaults
    const mergedOptions = {...defaultOptions, ...options};

    // Run the demo using the shared utility
    return await runDemo('Math Inference Demo', taskDefs, mergedOptions);
}

export default mathInferenceDemo;

// This makes the demo runnable directly
if (import.meta.url.startsWith('file:')) {
    mathInferenceDemo().catch(console.error);
}

// This makes it testable
// In your test file, you would import and call:
// await mathInferenceDemo({ assertions: (system) => { /* your assertions */ } });