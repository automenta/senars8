// Category: Reasoning
// Description: Demonstrates how the system revises the truth values of beliefs based on new evidence and contradictions.

import {runDemo} from '../shared/demo-utils.js';

async function advancedTruthValueRevisionDemo() {
    const taskDefs = [
        // Initial belief with high confidence
        {sentence: '(birds --> can_fly).', truth: [0.9, 0.9]},
        // Contradictory evidence
        {sentence: '(penguin --> bird).', truth: [1.0, 0.9]},
        {sentence: '(penguin --> not_fly).', truth: [1.0, 0.9]},
        // A question to trigger reasoning
        {sentence: '(birds --> can_fly)?', truth: [1.0, 0.9]}
    ];

    const postCycleCallback = async (system) => {
        console.log("\nQuerying the revised belief about birds flying...");
        const revisedBelief = system.introspection.queryTasks({termKey: '(birds --> can_fly)', punctuation: '.'});
        if (revisedBelief.length > 0) {
            const {frequency, confidence} = revisedBelief[0].state.truthValue;
            console.log(`Revised truth value for "(birds --> can_fly)": freq=${frequency.toFixed(2)}, conf=${confidence.toFixed(2)}`);
        } else {
            console.log("Belief not found or not revised yet.");
        }
    };

    await runDemo('Advanced Truth Value Revision Demo', taskDefs, {
        cycleCount: 5,
        postCycleCallback
    });
}

export default advancedTruthValueRevisionDemo;

if (import.meta.url.startsWith('file:')) {
    advancedTruthValueRevisionDemo().catch(console.error);
}