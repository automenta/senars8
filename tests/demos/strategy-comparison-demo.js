// Category: Reasoning
// Description: Compares different reasoning strategies, such as Brute-Force vs. Priority-based Bag Sampling.

import {runDemo} from '../../utils/shared/demo-utils.js';
import {info} from '../../common/services/Logger.js';

async function strategyComparisonDemo(options = {}) {
    const taskDefs = [
        // Basic beliefs about the agent's capabilities
        ['I CAN SOLVE PROBLEMS', '.', {frequency: 0.9, confidence: 0.8}],
        ['I AM CAPABLE', '.', {frequency: 0.8, confidence: 0.7}],
        ['I LEARN FROM EXPERIENCE', '.', {frequency: 0.7, confidence: 0.6}],

        // Goals to achieve
        ['SOLVE_COMPLEX_PROBLEMS', '!'],
        ['IMPROVE_MYSELF', '!'],
        ['LEARN_NEW_SKILLS', '!'],

        // Some implications
        ['IF I CAN SOLVE PROBLEMS THEN I AM CAPABLE', '.'],
        ['IF I AM CAPABLE THEN I CAN ACHIEVE GOALS', '.'],
        ['IF I LEARN FROM EXPERIENCE THEN I IMPROVE_MYSELF', '.']
    ];

    const defaultOptions = {
        cycleCount: 15,
        postCycleCallback: async (_system) => {
            info("\n--- Running with BruteForceStrategy ---");
            return await runDemo('Strategy Comparison (Brute Force)', taskDefs, {
                cycleCount: 5,
                config: {
                    reasoner: {
                        strategy: 'BruteForce'
                    }
                },
                postCycleCallback: (_system2) => {
                    info("Derived tasks will involve all combinations, regardless of priority.");
                },
                ...options
            });
        }
    };

    return await runDemo('Strategy Comparison', taskDefs, defaultOptions);
}

export default strategyComparisonDemo;

if (import.meta.url.startsWith('file:')) {
    strategyComparisonDemo().catch(console.error);
}
