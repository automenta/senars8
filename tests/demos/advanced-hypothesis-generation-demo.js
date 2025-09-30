// Category: Language Model
// Description: Demonstrates the system's advanced hypothesis generation capabilities using large language models.

import {runSystem} from '../../utils/runner.js';
import {info} from '../../common/services/Logger.js';
import {SystemCommands} from '../../core/system/SystemCommands.js';
import {createTestSystem} from '../test-helpers.js';
import Task from '../../core/core/Task.js';
import Term from '../../core/core/Term.js';

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

    const {system, commandBus} = createTestSystem();

    commandBus.request.mockImplementation(async (command, payload) => {
        if (command === SystemCommands.LM_GENERATE_HYPOTHESES) {
            return [new Task(new Term('hypothesis1'), '.', {frequency: 0.6, confidence: 0.6})];
        }
        if (command === SystemCommands.LM_EVALUATE_AND_RANK_HYPOTHESES) {
            return payload.hypotheses.sort((a, b) => b.state.truthValue.confidence - a.state.truthValue.confidence);
        }
        if (command === SystemCommands.MEMORY_GET_ALL_TASKS) {
            return await system.introspection.queryTasks({});
        }
        return null;
    });


    const defaultOptions = {
        cycleCount: 3,
        postCycleCallback: async (sys) => {
            info("Running hypothesis generation...");
            const allTasks = await sys.commandBus.request(SystemCommands.MEMORY_GET_ALL_TASKS);
            const hypotheses = await sys.commandBus.request(SystemCommands.LM_GENERATE_HYPOTHESES, {
                tasks: allTasks,
                options: {
                    type: 'creative',
                    num: 5
                }
            });

            info(`Generated ${hypotheses.length} creative hypotheses:`);

            info("Evaluating and ranking hypotheses...");
            const rankedHypotheses = await sys.commandBus.request(SystemCommands.LM_EVALUATE_AND_RANK_HYPOTHESES, {
                tasks: allTasks,
                hypotheses,
            });

            info(`Ranked hypotheses (${rankedHypotheses.length} total):`);
            rankedHypotheses.slice(0, 3).forEach((hypothesis, index) => {
                info(`  ${index + 1}. ${hypothesis.termKey} | Frequency: ${hypothesis.state.truthValue.frequency.toFixed(2)}, Confidence: ${hypothesis.state.truthValue.confidence.toFixed(2)}`);
            });
        }
    };

    // Merge options with defaults
    const mergedOptions = {...defaultOptions, ...options, system};

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