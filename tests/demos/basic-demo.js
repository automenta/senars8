// Category: Core Reasoning
// Description: A basic demonstration of the system's core reasoning capabilities, including deduction and inheritance.

import {runSystem} from '../../utils/runner.js';
import {info} from '../../core/utils/logger.js';

/**
 * A unified demo that demonstrates basic reasoning capabilities.
 * Can be run as a standalone example or as a unit test.
 *
 * @param {object} options - Configuration options
 * @param {Function} [options.assertions] - Optional assertions for testing
 * @param {Function} [options.preCycleCallback] - Optional callback before cycles run
 * @param {Function} [options.postCycleCallback] - Optional callback after cycles run
 * @returns {Promise<System>} The system instance after running
 */
async function basicDemo(options = {}) {
    const taskDefs = [
        {sentence: '(bird --> animal).', truth: [1.0, 0.9]},
        {sentence: '(animal --> living).', truth: [1.0, 0.9]},
        {sentence: 'bird.', truth: [1.0, 0.9]},
        {sentence: '(living --> ?)?'}
    ];

    const defaultOptions = {
        cycleCount: 5,
        postCycleCallback: async (system) => {
            info("\nQuerying for inferred knowledge...");
            const inferred = system.introspection.queryTasks({term: 'living', punctuation: '.'});
            if (inferred.length > 0) {
                info("Inferred that 'bird' is 'living'.");
            } else {
                info("Inference not yet made.");
            }
        }
    };

    // Merge options with defaults
    const mergedOptions = {...defaultOptions, ...options};

    // Run the demo using the shared utility
    return await runSystem('Basic Demo', taskDefs, mergedOptions);
}

export default basicDemo;

// This makes the demo runnable directly
if (import.meta.url.startsWith('file:')) {
    basicDemo().catch(console.error);
}

// This makes it testable
// In your test file, you would import and call:
// await basicDemo({ assertions: (system) => { /* your assertions */ } });