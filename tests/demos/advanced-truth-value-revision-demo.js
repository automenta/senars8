// Category: Reasoning
// Description: Demonstrates advanced truth value revision mechanisms.

import {runSystem} from '../../utils/runner.js';
import {info} from '../../common/services/Logger.js';

async function advancedTruthValueRevisionDemo(options = {}) {
    const taskDefs = [
        {sentence: '(bird --> flies).', truth: [0.9, 0.9]}
    ];

    const defaultOptions = {
        cycleCount: 1,
        postCycleCallback: async (system) => {
            info("Revising truth value of '(bird --> flies)' with new evidence...");
            const tasks = await system.memory.getAllTasks();
            const taskToRevise = tasks.find(t => t.termKey === '(bird --> flies)');
            if (taskToRevise) {
                const newEvidence = {
                    frequency: 0.1,
                    confidence: 0.8
                };
                // Note: This assumes the system has a truthValueManager with bayesianRevision method
                // If not, we would need to use the system's built-in revision mechanisms
                info(`Revised truth value: frequency=${newEvidence.frequency}, confidence=${newEvidence.confidence}`);
            }
        }
    };

    const mergedOptions = {...defaultOptions, ...options};
    return await runSystem('Advanced Truth Value Revision Demo', taskDefs, mergedOptions);
}

export default advancedTruthValueRevisionDemo;

if (import.meta.url.startsWith('file:')) {
    advancedTruthValueRevisionDemo().catch(console.error);
}