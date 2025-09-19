// Category: API Usage
// Description: A blueprint demonstration of how to create, run, and inspect a SeNARS system using its core API.

import {runDemo} from '../../shared/demo-utils.js';
import {info} from '../../src/utils/logger.js';

/**
 * This demo serves as a template for creating a client application (like a GUI or a bot)
 * that interacts with the SeNARS system. It shows the fundamental steps of creating a system,
 * adding knowledge, running cognitive cycles, and introspecting the system's state.
 */
async function comprehensiveSystemDemo(options = {}) {
    const taskDefs = [
        // Foundational knowledge about animals
        {sentence: '(mammal --> warm_blooded).', truth: [1.0, 0.9]},
        {sentence: '(dog --> mammal).', truth: [1.0, 0.95]},
        // A question for the system to answer
        {sentence: '(<dog> --> warm_blooded)?', truth: [1.0, 0.9]}
    ];

    const defaultOptions = {
        cycleCount: 5,
        preCycleCallback: (system) => {
            info('Subscribing to system events...');
            system.introspection.on('SystemCycleEnded', (cycleResult) => {
                info(`EVENT [SystemCycleEnded]: Derived ${cycleResult.derivedTasks} new tasks.`);
            });
        },
        postCycleCallback: (system) => {
            info('Inspecting final memory state...');
            const answerTasks = system.introspection.queryTasks({
                termKey: '(<dog> --> warm_blooded)',
                punctuation: '.' // We are looking for a belief (an answer)
            });

            if (answerTasks.length > 0) {
                const bestAnswer = answerTasks.sort((a, b) => b.state.truthValue.confidence - a.state.truthValue.confidence)[0];
                info(`System's answer to "(<dog> --> warm_blooded)?": YES, with confidence ${bestAnswer.state.truthValue.confidence.toFixed(2)}`);
            } else {
                info('System did not find a definitive answer to our question in time.');
            }
        }
    };

    const mergedOptions = {...defaultOptions, ...options};
    return await runDemo('Comprehensive System Demo', taskDefs, mergedOptions);
}

export default comprehensiveSystemDemo;

// This allows the demo to be run directly from the command line
if (import.meta.url.startsWith('file:')) {
    comprehensiveSystemDemo().catch(console.error);
}
