// Category: Template
// Description: A template for creating unified demos that function as both runnable examples and unit tests.

import {runDemo} from '../../shared/demo-utils.js';
import {info} from '../../src/utils/logger.js';

/**
 * A unified demo function that can be run as both a standalone example and a unit test.
 *
 * @param {object} options - Configuration options
 * @param {Function} [options.assertions] - Optional assertions for testing
 * @param {Function} [options.preCycleCallback] - Optional callback before cycles run
 * @param {Function} [options.postCycleCallback] - Optional callback after cycles run
 * @returns {Promise<System>} The system instance after running
 */
async function unifiedDemoTemplate(options = {}) {
    // Define your tasks here
    const taskDefs = [
        // Add your task definitions here
        // {sentence: '(bird --> animal).', truth: [1.0, 0.9]},
        // {sentence: '(animal --> living).', truth: [1.0, 0.9]},
        // {sentence: 'bird.', truth: [1.0, 0.9]},
        // {sentence: '(living --> ?)?'}
    ];

    // Define default options
    const defaultOptions = {
        cycleCount: 5,
        // You can add custom callbacks here
        postCycleCallback: async (system) => {
            info("Demo completed. Add your custom logic here.");

            // If we're running in test mode, the assertions will be run by the runDemo function
            // You can also add test-specific logic here if needed
        }
    };

    // Merge options with defaults
    const mergedOptions = {...defaultOptions, ...options};

    // Run the demo using the shared utility
    return await runDemo('Unified Demo Template', taskDefs, mergedOptions);
}

export default unifiedDemoTemplate;

// This makes the demo runnable directly
if (import.meta.url.startsWith('file:')) {
    unifiedDemoTemplate().catch(console.error);
}

// This makes it testable
// In your test file, you would import and call:
// await unifiedDemoTemplate({ assertions: (system) => { /* your assertions */ } });