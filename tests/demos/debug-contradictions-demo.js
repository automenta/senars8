// Category: Debugging
// Description: A utility demo for debugging the system's contradiction detection and resolution mechanisms.

import {runDemo} from '../../utils/shared/demo-utils.js';
import {info} from '../../core/utils/logger.js';

async function debugContradictionsDemo(options = {}) {
    const taskDefs = [
        {sentence: '(bird --> can_fly).', truth: [0.9, 0.9]},
        {sentence: '(penguin --> bird).', truth: [1.0, 0.9]},
        {sentence: '(penguin --> not_fly).', truth: [1.0, 0.9]},
    ];

    const defaultOptions = {
        cycleCount: 3,
        postCycleCallback: (system) => {
            info("Inspecting contradictions...");
            const contradictions = system.introspection.getContradictions();
            info(`Found ${contradictions.length} contradictions: ${contradictions.map(c => c.type).join(', ')}`);
        }
    };

    const mergedOptions = {...defaultOptions, ...options};
    return await runDemo('Debug Contradictions Demo', taskDefs, mergedOptions);
}

export default debugContradictionsDemo;

if (import.meta.url.startsWith('file:')) {
    debugContradictionsDemo().catch(console.error);
}