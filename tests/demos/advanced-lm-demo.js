// Category: Language Model
// Description: Demonstrates advanced language model integration capabilities.

import {runDemo} from '../../shared/demo-utils.js';
import {info} from '../../src/utils/logger.js';

async function advancedLMDemo(options = {}) {
    const taskDefs = [
        {sentence: '(AI --> intelligent_system).', truth: [0.95, 0.9]},
        {sentence: '(neural_network --> machine_learning_model).', truth: [0.9, 0.85]},
        {sentence: '(symbolic_reasoning --> logical_inference).', truth: [0.85, 0.8]},
        {sentence: '(AI --> (&, neural_network, symbolic_reasoning)).', truth: [0.8, 0.75]},
        {sentence: '(cognitive_architecture --> AI).', truth: [0.75, 0.7]},
        {sentence: '(SeNARS --> cognitive_architecture).', truth: [1.0, 0.95]},
        {sentence: '(explain_seNARS)!', truth: [1.0, 0.9]}
    ];

    const defaultOptions = {
        cycleCount: 3,
        postCycleCallback: async (system) => {
            info("Asking the LM to explain its understanding of SeNARS...");
            const explanationResult = await system.lm.explain();
            if (explanationResult && explanationResult.explanation) {
                info(`LM Explanation: ${explanationResult.explanation.substring(0, 100)}...`);
            } else {
                info("LM Explanation: (Failed to retrieve explanation)");
            }
        }
    };

    const mergedOptions = {...defaultOptions, ...options};
    return await runDemo('Advanced LM Demo', taskDefs, mergedOptions);
}

export default advancedLMDemo;

if (import.meta.url.startsWith('file:')) {
    advancedLMDemo().catch(console.error);
}