// Category: Language Model
// Description: Demonstrates the system's advanced hypothesis generation capabilities using large language models.

import {runSystem} from '../../utils/runner.js';
import {info} from '../../common/services/Logger.js';

/**
 * A unified demo that demonstrates advanced hypothesis generation capabilities.
 * Can be run as a standalone example or as a unit test.
 *
 * @param {object} options - Configuration options
 * @param {Function} [options.assertions] - Optional assertions for testing
 * @param {Function} [options.preCycleCallback] - Optional callback before cycles run
 * @param {Function} [options.postCycleCallback] - Optional callback after cycles run
 * @returns {Promise<System>} The system instance after running
 */
async function advancedHypothesisGenerationDemo(options = {}) {
    const taskDefs = [
        {sentence: '<a --> b>.', truth: [1.0, 0.9]},
        {sentence: '<b --> c>.', truth: [1.0, 0.9]},
        {sentence: '<d --> c>.', truth: [1.0, 0.9]},
    ];

    const defaultOptions = {
        cycleCount: 3,
        postCycleCallback: async (system) => {
            info("Running hypothesis generation...");
            const hypotheses = await system.lm.generateHypotheses(system.memory.getAllTasks(), {
                type: 'creative',
                num: 5
            });

            info(`Generated ${hypotheses.length} creative hypotheses:`);

            info("Evaluating and ranking hypotheses...");
            const rankedHypotheses = await system.lm.evaluateAndRankHypotheses(system.memory.getAllTasks(), hypotheses);

            info(`Ranked hypotheses (${rankedHypotheses.length} total):`);
            rankedHypotheses.slice(0, 3).forEach((hypothesis, index) => {
                info(`  ${index + 1}. ${hypothesis.termKey} | Frequency: ${hypothesis.state.truthValue.frequency.toFixed(2)}, Confidence: ${hypothesis.state.truthValue.confidence.toFixed(2)}`);
            });
        }
    };

    // Merge options with defaults
    const mergedOptions = {...defaultOptions, ...options};

    // Run the demo using the shared utility
    return await runSystem('Advanced Hypothesis Generation Demo', taskDefs, mergedOptions);
}

export default advancedHypothesisGenerationDemo;

// This makes the demo runnable directly
if (import.meta.url.startsWith('file:')) {
    advancedHypothesisGenerationDemo().catch(console.error);
}

// This makes it testable
// In your test file, you would import and call:
// await advancedHypothesisGenerationDemo({ assertions: (system) => { /* your assertions */ } });
