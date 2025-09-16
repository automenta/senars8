// Category: Reasoning
// Description: Compares different reasoning strategies, such as Brute-Force vs. Priority-based Bag Sampling.

import { runDemo } from '../shared/demo-utils.js';

async function strategyComparisonDemo() {
    const taskDefs = [
        { sentence: '(HighPriority --> result).', truth: [1.0, 0.99] },
        { sentence: '(MediumPriority --> result).', truth: [1.0, 0.5] },
        { sentence: '(LowPriority --> result).', truth: [1.0, 0.1] },
    ];

    console.log("--- Running with default BagSamplingStrategy ---");
    await runDemo('Strategy Comparison (Bag Sampling)', taskDefs, {
        cycleCount: 5,
        postCycleCallback: (system) => {
            console.log("Derived tasks will likely involve 'HighPriority'.");
        }
    });

    console.log("\n--- Running with BruteForceStrategy ---");
    await runDemo('Strategy Comparison (Brute Force)', taskDefs, {
        cycleCount: 5,
        config: {
            reasoner: {
                strategy: 'BruteForce'
            }
        },
        postCycleCallback: (system) => {
            console.log("Derived tasks will involve all combinations, regardless of priority.");
        }
    });
}

export default strategyComparisonDemo;

if (import.meta.url.startsWith('file:')) {
    strategyComparisonDemo().catch(console.error);
}
