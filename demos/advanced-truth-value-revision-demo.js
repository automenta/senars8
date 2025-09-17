import {
    runDemo
} from '../shared/demo-utils.js';

async function advancedTruthValueRevisionDemo() {
    const initialBeliefs = [{
        sentence: '(bird --> flies).',
        truth: [0.9, 0.9]
    }, ];

    const postCycleCallback = async (system) => {
        console.log("\nRevising truth value of '(bird --> flies)' with new evidence...");
        const tasks = system.memory.getAllTasks();
        const taskToRevise = tasks.find(t => t.termKey === '(bird --> flies)');
        if (taskToRevise) {
            const newEvidence = {
                frequency: 0.1,
                confidence: 0.8
            };
            const revisedTruth = await system.truthValueManager.bayesianRevision(taskToRevise, newEvidence);
            console.log("Revised truth value:", revisedTruth);
        }
    };

    await runDemo('Advanced Truth Value Revision Demo', initialBeliefs, {
        cycleCount: 1,
        postCycleCallback
    });
}

export default advancedTruthValueRevisionDemo;

if (import.meta.url.startsWith('file:')) {
    advancedTruthValueRevisionDemo().catch(console.error);
}