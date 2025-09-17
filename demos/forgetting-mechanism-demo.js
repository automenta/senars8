// Category: Memory
// Description: Illustrates the time-based forgetting strategy, where the confidence of beliefs decays over time.

import {runDemo} from '../shared/demo-utils.js';

async function forgettingMechanismDemo() {
    const now = Date.now();
    const oneHourAgo = now - 3600 * 1000;

    const taskDefs = [
        // A belief from one hour ago
        {
            sentence: '(old_belief --> property).',
            truth: [1.0, 0.9],
            stamp: {creationTime: oneHourAgo, lastAccessed: oneHourAgo}
        },
        // A recent belief
        {
            sentence: '(new_belief --> property).',
            truth: [1.0, 0.9],
            stamp: {creationTime: now, lastAccessed: now}
        }
    ];

    const postCycleCallback = (system) => {
        console.log("\nInspecting confidence decay...");
        const oldBelief = system.introspection.queryTasks({termKey: '(old_belief --> property)'})[0];
        const newBelief = system.introspection.queryTasks({termKey: '(new_belief --> property)'})[0];

        if (oldBelief && newBelief) {
            const oldConfidence = oldBelief.state.truthValue.confidence;
            const newConfidence = newBelief.state.truthValue.confidence;
            console.log(`Old belief confidence: ${oldConfidence.toFixed(2)} (started at 0.9)`);
            console.log(`New belief confidence: ${newConfidence.toFixed(2)} (started at 0.9)`);
            if (oldConfidence < newConfidence) {
                console.log("✅ PASSED: Older belief has lower confidence.");
            } else {
                console.log("❌ FAILED: Older belief did not decay as expected.");
            }
        } else {
            console.log("Could not find beliefs to compare.");
        }
    };

    await runDemo('Forgetting Mechanism Demo', taskDefs, {
        cycleCount: 10, // Run enough cycles to trigger maintenance and decay
        config: {
            memory: {
                FORGETTING_DECAY_RATE: 0.1 // Accelerate decay for demo purposes
            }
        },
        postCycleCallback
    });
}

export default forgettingMechanismDemo;

if (import.meta.url.startsWith('file:')) {
    forgettingMechanismDemo().catch(console.error);
}
