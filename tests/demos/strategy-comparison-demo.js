// Category: Reasoning
// Description: Compares different reasoning strategies, such as Brute-Force vs. Priority-based Bag Sampling.

import {runDemo} from '../../shared/demo-utils.js';
import {info} from '../../src/utils/logger.js';

async function strategyComparisonDemo(options = {}) {
    const taskDefs = [
        {sentence: '(HighPriority --> result).', truth: [1.0, 0.99]},
        {sentence: '(MediumPriority --> result).', truth: [1.0, 0.5]},
        {sentence: '(LowPriority --> result).', truth: [1.0, 0.1]},
    ];

    info("--- Running with default BagSamplingStrategy ---");
    await runDemo('Strategy Comparison (Bag Sampling)', taskDefs, {
        cycleCount: 5,
        postCycleCallback: (system) => {
            info("Derived tasks will likely involve 'HighPriority'.");
        },
        ...options
    });

    info("\n--- Running with BruteForceStrategy ---");
    return await runDemo('Strategy Comparison (Brute Force)', taskDefs, {
        cycleCount: 5,
        config: {
            reasoner: {
                strategy: 'BruteForce'
            }
        },
        postCycleCallback: (system) => {
            info("Derived tasks will involve all combinations, regardless of priority.");
        },
        ...options
    });
}

export default strategyComparisonDemo;

if (import.meta.url.startsWith('file:')) {
    strategyComparisonDemo().catch(console.error);
}
