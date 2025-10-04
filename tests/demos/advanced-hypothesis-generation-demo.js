// Category: Language Model
// Description: Demonstrates the system's advanced hypothesis generation capabilities using large language models.

import {runSystem} from '../../utils/runner.js';
import {info} from '../../core/utils/logger.js';
import {SystemCommands} from '../../core/system/SystemCommands.js';
import SystemFactory from '../../core/system/SystemFactory.js';
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
        {sentence: '(a --> b).', truth: [1.0, 0.9]},
        {sentence: '(b --> c).', truth: [1.0, 0.9]},
        {sentence: '(d --> c).', truth: [1.0, 0.9]},
    ];

    const system = SystemFactory.createSystem();

    // Override the commandBus to simulate hypothesis generation
    const originalRequest = system.commandBus.request.bind(system.commandBus);
    system.commandBus.request = async (command, payload) => {
        if (command === SystemCommands.LM_GENERATE_HYPOTHESES) {
            // Simulate hypothesis generation with some creative hypotheses
            const hypotheses = [
                new Task(new Term('hypothesis1'), '.', {frequency: 0.6, confidence: 0.6}),
                new Task(new Term('hypothesis2'), '.', {frequency: 0.7, confidence: 0.5}),
                new Task(new Term('hypothesis3'), '.', {frequency: 0.5, confidence: 0.8}),
                new Task(new Term('hypothesis4'), '.', {frequency: 0.8, confidence: 0.4}),
                new Task(new Term('hypothesis5'), '.', {frequency: 0.4, confidence: 0.9})
            ];
            return hypotheses;
        }
        if (command === SystemCommands.LM_EVALUATE_AND_RANK_HYPOTHESES) {
            if (payload && payload.hypotheses) {
                // Rank hypotheses based on confidence * frequency (common heuristic)
                return payload.hypotheses.sort((a, b) => {
                    const scoreA = a.state.truthValue.confidence * a.state.truthValue.frequency;
                    const scoreB = b.state.truthValue.confidence * b.state.truthValue.frequency;
                    return scoreB - scoreA; // Higher scores first
                });
            }
            return [];
        }
        if (command === SystemCommands.MEMORY_GET_ALL_TASKS) {
            // Return all tasks currently in the system
            return await system.introspection.queryTasks({});
        }
        // For all other commands, use the original request method
        return await originalRequest(command, payload);
    };


    const defaultOptions = {
        cycleCount: 3,
        system, // Use the provided system instead of creating a new one
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
                const score = hypothesis.state.truthValue.confidence * hypothesis.state.truthValue.frequency;
                info(`  ${index + 1}. ${hypothesis.termKey} | Score: ${score.toFixed(3)} (F: ${hypothesis.state.truthValue.frequency.toFixed(2)}, C: ${hypothesis.state.truthValue.confidence.toFixed(2)})`);
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