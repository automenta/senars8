// Category: Reasoning
// Description: Showcases enhanced contradiction resolution strategies, such as asking clarifying questions or seeking more context.

import { runDemo } from '../shared/demo-utils.js';

async function enhancedContradictionResolutionDemo() {
    const taskDefs = [
        // A belief that is likely to be challenged
        { sentence: '(all_swans --> white).', truth: [0.9, 0.8] },
        // A surprising, contradictory observation
        { sentence: '(<black_swan> --> swan).', truth: [1.0, 0.95] },
        { sentence: '(<black_swan> --> black).', truth: [1.0, 0.95] },
        // A goal that encourages the system to investigate the contradiction
        { sentence: 'investigate_swan_color!', truth: [1.0, 0.9] }
    ];

    const postCycleCallback = (system) => {
        console.log("\nChecking for meta-cognitive tasks (e.g., questions for clarification)...");
        const metaTasks = system.introspection.queryTasks({ isMeta: true });
        if (metaTasks.length > 0) {
            console.log(`Found ${metaTasks.length} meta-tasks:`);
            metaTasks.forEach(task => {
                console.log(`  - ${task.termKey}${task.punctuation}`);
            });
        } else {
            console.log("No meta-tasks generated for clarification.");
        }
    };

    await runDemo('Enhanced Contradiction Resolution Demo', taskDefs, {
        cycleCount: 7,
        postCycleCallback
    });
}

export default enhancedContradictionResolutionDemo;

if (import.meta.url.startsWith('file:')) {
    enhancedContradictionResolutionDemo().catch(console.error);
}